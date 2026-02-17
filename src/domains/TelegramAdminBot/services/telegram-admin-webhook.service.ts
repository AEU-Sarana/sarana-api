import prisma from '@src/database/client';
import { TelegramAdminParserService } from '@src/domains/TelegramAdminBot/services/telegram-admin-parser.service';
import { TelegramAdminInputRouterService } from '@src/domains/TelegramAdminBot/services/telegram-admin-input-router.service';
import { TelegramAdminLinksService } from '@src/domains/TelegramAdminBot/services/telegram-admin-links.service';
import { TelegramService } from '@src/domains/Telegram/services/telegram.service';
import { TelegramBotService } from '@src/domains/Telegram/services/telegram-bot.service';
import { ReceiptLinkService } from '@src/domains/Receipt/services/V1/receipt-link.service';
import { ReceiptImageService } from '@src/domains/Receipt/services/V1/receipt-image.service';
import { CustomerLinkingService } from '@src/domains/Customer/services/V1/customer-linking.service';
import { logger } from '@src/shared/utils/logger';
import { eventBus } from '@src/shared/events/event-bus';
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
    const { update_id } = update;
    const replayKey = `telegram:update_id:${update_id}`;
    const isDuplicate = await redisConnection.get(replayKey);
    if (isDuplicate) {
      logger.info('Telegram update replay detected, skipping', { updateId: update_id });
      return { enqueued: false };
    }
    await redisConnection.set(replayKey, '1', 'EX', 3600); // Store for 1 hour

    const { telegramUserId, chatId, text, callbackData } =
      TelegramAdminParserService.parse(update);

    logger.info('Telegram admin webhook received', {
      updateId: update_id,
      chatId,
      fromId: telegramUserId,
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

    if (pendingState !== 'NONE') {
      logger.info('Telegram admin pending state', {
        chatId,
        fromId: telegramUserId,
        state: pendingState,
      });
    }

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

        const result = await TelegramAdminInputRouterService.handlePendingInput(
          chatId,
          trimmed,
          adminUserId,
          telegramUserId
        );

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
      command.type === 'RECEIPT_START' ||
      command.type === 'CUSTOMER_LINK_START' ||
      text.startsWith('/link');

    // Handle receipt start command directly (customer clicking /start <code>)
    if (command.type === 'RECEIPT_START') {
      return this.handleReceiptStart(
        chatId,
        String(telegramUserId),
        String(chatId),
        update.message?.from?.username,
        command.code
      );
    }

    // Handle customer linking command
    if (command.type === 'CUSTOMER_LINK_START') {
      return this.handleCustomerLinkStart(
        chatId,
        telegramUserId,
        chatId,
        update.message?.from?.username,
        command.token
      );
    }

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

  static async handleReceiptStart(
    chatId: number | string,
    telegramUserId: string,
    telegramChatId: string,
    telegramUsername: string | undefined,
    code: string
  ): Promise<{ enqueued: false }> {
    try {
      logger.info('Handling receipt start command', { chatId });

      // Step 1: Validate the receipt code
      const validation = await ReceiptLinkService.validateReceiptCode(code);

      // --- SHOW INITIAL LOADING MESSAGE ---
      let loadingMessageId: number | undefined;
      try {
        const loadingMsg = await TelegramService.sendMessageByChatId(
          chatId,
          '⏳ កំពុងបង្កើតវិក្កយបត្រ... (Generating your receipt, please wait...)',
          'Markdown'
        );
        loadingMessageId = loadingMsg.messageId;
      } catch (error) {
        logger.warn('Failed to send loading message', { error });
      }

      // --- WAIT FOR SYNC LOGIC ---
      const SYNC_WAIT_TIMEOUT = 12000; // 12 seconds

      // Check if order already has items
      const itemCount = await prisma.orderItem.count({
        where: { orderId: validation.order_id },
      });

      // If no items, we suspect a pending sync
      if (itemCount === 0) {
        logger.info('Order has no items, waiting for sync event...', {
          orderId: validation.order_id,
          receiptNumber: validation.receipt_number,
        });

        // Update loading message to reflect we are waiting for sync
        if (loadingMessageId) {
          try {
            await TelegramService.editMessageByChatId(
              chatId,
              loadingMessageId,
              '⏳ កំពុងរៀបចំវិក្កយបត្រ... សូមរង់ចាំមួយភ្លែត (Preparing your receipt, please wait...)',
              'Markdown'
            );
          } catch (error) {
            logger.warn('Failed to edit loading message for sync wait', { error });
          }
        }

        await new Promise<void>((resolve) => {
          const timeout = setTimeout(() => {
            logger.warn('Timeout waiting for order sync event', { orderId: validation.order_id });
            resolve();
          }, SYNC_WAIT_TIMEOUT);

          eventBus.once(`order_synced:${validation.order_id}`, () => {
            logger.info('Received order sync event, proceeding with receipt', {
              orderId: validation.order_id,
            });
            clearTimeout(timeout);
            resolve();
          });
        });
      }
      // --- END WAIT FOR SYNC LOGIC ---

      // Step 2: Generate receipt JPG image buffer (no upload)
      const receiptImage = await ReceiptImageService.generateReceiptJpgBuffer(validation.order_id);

      // Step 3: Get Telegram bot token
      const telegramConfig = await TelegramService.getTelegramConfig();
      if (!telegramConfig) {
        throw new Error('Telegram not configured');
      }

      // Step 4: Send the receipt image
      await TelegramBotService.sendPhoto(
        telegramConfig.bot_token,
        String(chatId),
        receiptImage.buffer,
        `🧾 Receipt #${validation.receipt_number}`,
        receiptImage.filename
      );

      // --- CLEANUP LOADING MESSAGE ---
      if (loadingMessageId) {
        try {
          await TelegramService.deleteMessage(chatId, loadingMessageId);
        } catch (error) {
          logger.warn('Failed to delete loading message', { error });
        }
      }

      // Step 5: Mark the receipt as used
      await ReceiptLinkService.markReceiptAsUsed(code, {
        telegram_user_id: telegramUserId,
        telegram_chat_id: telegramChatId,
        telegram_username: telegramUsername,
      });

      return { enqueued: false };
    } catch (error: any) {
      logger.error('Failed to handle receipt start', {
        error: error.message,
        chatId,
      });

      let errorMessage = '❌ Failed to retrieve receipt. Please try again.';
      if (error.message === 'Invalid receipt code') {
        errorMessage = '❌ Invalid receipt code.';
      } else if (error.message === 'This receipt code was already used') {
        errorMessage = '⚠️ This receipt has already been claimed.';
      } else if (error.message === 'This receipt code is no longer active') {
        errorMessage = '⚠️ This receipt link is no longer active.';
      } else if (error.message === 'Receipt code has expired') {
        errorMessage = '⚠️ This receipt has expired.';
      }

      await TelegramService.sendMessageByChatId(chatId, errorMessage, 'Markdown');
      return { enqueued: false };
    }
  }

  static async handleCustomerLinkStart(
    chatId: number | string,
    telegramUserId: number,
    telegramChatId: number,
    telegramUsername: string | undefined,
    token: string
  ): Promise<{ enqueued: false }> {
    try {
      logger.info('Handling customer link start', { chatId });
      await CustomerLinkingService.handleCustomerLink(
        token,
        telegramUserId,
        telegramChatId,
        telegramUsername
      );
      return { enqueued: false };
    } catch (error: any) {
      logger.error('Failed to handle customer link start', {
        error: error.message,
        chatId,
      });
      await TelegramService.sendMessageByChatId(
        chatId,
        '❌ Invalid or expired linking link. Please scan the QR code again.',
        'Markdown'
      );
      return { enqueued: false };
    }
  }
}
