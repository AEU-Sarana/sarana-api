import { TelegramAdminCommand, TelegramWebhookPayload } from '@src/domains/TelegramAdminBot/types/telegram-admin-bot.types';

export class TelegramAdminParserService {
  static parse(update: TelegramWebhookPayload) {
    return {
      telegramUserId: update.message?.from?.id || update.callback_query?.from?.id!,
      chatId: update.message?.chat?.id || update.callback_query?.message?.chat?.id!,
      text: update.message?.text,
      callbackData: update.callback_query?.data
    };
  }

  static toCommand(text?: string, callbackData?: string): TelegramAdminCommand {
    if (callbackData?.startsWith('confirm:')) {
      return { type: 'STOCK_WRITE', requestId: callbackData.split(':')[1] };
    }
    if (!text) return { type: 'UNKNOWN' };
    if (text.startsWith('/report')) return { type: 'REPORT', date: new Date().toISOString().slice(0, 10) };
    if (text.startsWith('/lowstock')) return { type: 'LOWSTOCK' };
    if (text.startsWith('/p ')) return { type: 'PRODUCT_LOOKUP', productCode: text.split(' ')[1] };
    if (text.startsWith('/stock')) {
      const parts = text.split(' ').filter(Boolean);
      return {
        type: 'STOCK_WRITE',
        movementType: parts[1]?.toUpperCase(),
        productCode: parts[2],
        qty: Number(parts[3]),
      };
    }
    return { type: 'UNKNOWN' };
  }
}
