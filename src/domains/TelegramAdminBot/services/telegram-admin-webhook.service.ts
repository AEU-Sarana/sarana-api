import { TelegramAdminParserService } from '@src/domains/TelegramAdminBot/services/telegram-admin-parser.service';
import { TelegramService } from '@src/domains/Telegram/services/telegram.service';
import { logger } from '@src/shared/utils/logger';
import { TelegramWebhookPayload } from '@src/domains/TelegramAdminBot/types/telegram-admin-bot.types';
import { telegramAdminQueue, redisConnection } from '@src/domains/TelegramAdminBot/jobs/telegram-admin.queue';
import type {
  TelegramAdminCallbackJobPayload,
  TelegramAdminMessageJobPayload,
} from '@src/domains/TelegramAdminBot/types/telegram-admin-jobs.types';

const CALLBACK_DEDUPE_TTL_SECONDS = 10;

export class TelegramAdminWebhookService {
  static async handleUpdate(update: TelegramWebhookPayload) {
    const { telegramUserId, chatId, text, callbackData } =
      TelegramAdminParserService.parse(update);

    if (callbackData) {
      return this.handleCallback(update.callback_query);
    }

    if (!text) {
      return { enqueued: false };
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

    try {
      await TelegramService.answerCallback(callback.id, 'OK');
    } catch (error: any) {
      logger.warn('Failed to answer Telegram callback', { error: error.message });
    }

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
