import { TelegramAdminParserService } from '@src/domains/TelegramAdminBot/services/telegram-admin-parser.service';
import { TelegramAdminInputRouterService } from '@src/domains/TelegramAdminBot/services/telegram-admin-input-router.service';
import { TelegramAdminLinksService } from '@src/domains/TelegramAdminBot/services/telegram-admin-links.service';
import { TelegramService } from '@src/domains/Telegram/services/telegram.service';
import { logger } from '@src/shared/utils/logger';
import { TelegramWebhookPayload } from '@src/domains/TelegramAdminBot/types/telegram-admin-bot.types';
import { telegramAdminQueue, redisConnection } from '@src/domains/TelegramAdminBot/jobs/telegram-admin.queue';
import {
  clearStockHistoryPending,
  getStockHistoryPending,
  clearStockInPending,
  getStockInPending,
  clearStockAdjustPending,
  getStockAdjustPending,
} from './telegram-admin-state.service';
import { getMenuStateKey, resetStack } from '@src/domains/Telegram/menu/menu-state';
import { renderMenu } from '@src/domains/Telegram/menu/menu-renderer';
import type {
  TelegramAdminCallbackJobPayload,
  TelegramAdminMessageJobPayload,
} from '@src/domains/TelegramAdminBot/types/telegram-admin-jobs.types';

const CALLBACK_DEDUPE_TTL_SECONDS = 10;

export class TelegramAdminWebhookService {
  static async handleUpdate(update: TelegramWebhookPayload) {
    const { telegramUserId, chatId, text, callbackData } =
      TelegramAdminParserService.parse(update);

    logger.info('Telegram admin webhook received', {
      updateId: update.update_id,
      chatId,
      fromId: telegramUserId,
      text,
      hasCallback: Boolean(callbackData),
    });

    if (callbackData) {
      return this.handleCallback(update.callback_query);
    }

    if (!text) {
      return { enqueued: false };
    }

    const pendingStockIn = getStockInPending(chatId, telegramUserId);
    const pendingStockAdjust = getStockAdjustPending(chatId, telegramUserId);
    const pendingStockHistory = getStockHistoryPending(chatId, telegramUserId);
    const pendingState = pendingStockIn
      ? 'WAIT_STOCK_IN_BLOCK'
      : pendingStockAdjust
        ? 'WAIT_STOCK_ADJUST_BLOCK'
        : pendingStockHistory
          ? 'WAIT_PRODUCT_QUERY_STOCK_HISTORY'
          : 'NONE';
    logger.info('Telegram admin pending state', {
      chatId,
      fromId: telegramUserId,
      state: pendingState,
    });

    if (pendingStockIn || pendingStockAdjust || pendingStockHistory) {
      try {
        if (pendingStockIn && pendingStockIn.telegramUserId !== telegramUserId) {
          await TelegramService.sendMessageByChatId(
            chatId,
            'Another user is completing a stock in request. Please wait.',
            'Markdown'
          );
          return { enqueued: false };
        }

        if (pendingStockAdjust && pendingStockAdjust.telegramUserId !== telegramUserId) {
          await TelegramService.sendMessageByChatId(
            chatId,
            'Another user is completing a stock adjustment request. Please wait.',
            'Markdown'
          );
          return { enqueued: false };
        }

        if (pendingStockHistory && pendingStockHistory.telegramUserId !== telegramUserId) {
          await TelegramService.sendMessageByChatId(
            chatId,
            'Another user is completing a stock history query. Please wait.',
            'Markdown'
          );
          return { enqueued: false };
        }

        const trimmed = text.trim();
        if (trimmed.toLowerCase() === '/cancel') {
          if (pendingStockIn) {
            clearStockInPending(chatId, telegramUserId);
          }
          if (pendingStockAdjust) {
            clearStockAdjustPending(chatId, telegramUserId);
          }
          if (pendingStockHistory) {
            clearStockHistoryPending(chatId, telegramUserId);
          }
          const menuKey = getMenuStateKey(chatId, telegramUserId);
          resetStack(menuKey);
          const targetMenu = pendingStockAdjust || pendingStockIn ? 'update_stock' : 'main';
          await renderMenu({ chatId, telegramUserId }, targetMenu, { preferEdit: false });
          return { enqueued: false };
        }

        let adminUserId = 0;
        try {
          const link = await TelegramAdminLinksService.requireActiveLink(telegramUserId, chatId);
          adminUserId = link.userId;
        } catch (linkError: any) {
          if (linkError?.message === 'TELEGRAM_ADMIN_NOT_LINKED') {
            await TelegramService.sendMessageByChatId(
              chatId,
              'Bot មិនទាន់ភ្ជាប់ជាមួយ Admin ទេ។ សូមប្រើ /link CODE។',
              'Markdown'
            );
            return { enqueued: false };
          }
          throw linkError;
        }

        logger.info('Telegram admin pending handler start', {
          chatId,
          fromId: telegramUserId,
          text: trimmed,
        });
        const result = await TelegramAdminInputRouterService.handlePendingInput(
          chatId,
          trimmed,
          adminUserId,
          telegramUserId
        );
        logger.info('Telegram admin pending handler complete', {
          chatId,
          fromId: telegramUserId,
          handled: Boolean(result),
        });

        if (!result || !('text' in result)) {
          return { enqueued: false };
        }

        if (result.replyMarkup) {
          await TelegramService.sendMenuMessage(
            chatId,
            result.text,
            result.replyMarkup,
            result.parseMode ?? 'Markdown'
          );
        } else {
          await TelegramService.sendMessageByChatId(
            chatId,
            result.text,
            result.parseMode ?? 'Markdown'
          );
        }

        return { enqueued: false };
      } catch (error: any) {
        logger.error('Telegram admin pending input failed', {
          error: error.message,
          stack: error.stack,
          chatId,
          fromId: telegramUserId,
        });
        await TelegramService.sendMessageByChatId(
          chatId,
          '❌ Something went wrong. Please try again.',
          'Markdown'
        );
        return { enqueued: false };
      }
    }

    const command = TelegramAdminParserService.toCommand(text);
    const isLightCommand =
      command.type === 'START' ||
      command.type === 'PRODUCT_LOOKUP' ||
      command.type === 'STOCK_WRITE' ||
      text.startsWith('/link');

    let processingMessageId: number | undefined;
    if (!isLightCommand) {
      const processing = await TelegramService.sendMessageByChatId(
        chatId,
        '⏳ Processing...',
        'Markdown'
      );
      processingMessageId = processing.messageId;
    }

    const payload: TelegramAdminMessageJobPayload = {
      chatId,
      text,
      telegramUserId,
      processingMessageId,
    };

    await telegramAdminQueue.add('HANDLE_MESSAGE', payload);

    return { enqueued: true };
  }

  static async handleCommand(message: any, adminUserId = 0) {
    const update: TelegramWebhookPayload = { update_id: 0, message };
    return this.handleUpdate(update);
  }

  static async handleCallback(callback: any, adminUserId = 0) {
    const data = callback.data || '';
    const chatId = callback.message?.chat?.id;
    const telegramUserId = callback?.from?.id ?? 0;
    const messageId = callback?.message?.message_id;

    let processingMessageId: number;
    try {
      const processing = await TelegramService.sendMessageByChatId(
        chatId,
        '⏳ Processing...',
        'Markdown'
      );
      processingMessageId = processing.messageId;
    } catch (error: any) {
      logger.error('Failed to send processing message', { error: error.message });
      throw error;
    }

    setImmediate(async () => {
      try {
        await TelegramService.answerCallback(callback.id, '⏳ Processing...');
      } catch (error: any) {
        logger.warn('Failed to answer Telegram callback', { error: error.message });
      }
    });

    const dedupeKey = `tgadmin:cb:${telegramUserId}:${data}`;
    const acquired = await redisConnection.set(
      dedupeKey,
      '1',
      'EX',
      CALLBACK_DEDUPE_TTL_SECONDS,
      'NX'
    );

    if (!acquired) {
      await TelegramService.editMessageByChatId(
        chatId,
        processingMessageId,
        '⏳ Already processing…',
        'Markdown'
      );
      return { enqueued: false };
    }

    const payload: TelegramAdminCallbackJobPayload = {
      chatId,
      callbackData: data,
      callbackQueryId: callback.id,
      processingMessageId,
      telegramUserId,
      messageId,
    };

    await telegramAdminQueue.add('HANDLE_CALLBACK', payload);
    return { enqueued: true };
  }
}
