import { TelegramAdminCommand, TelegramWebhookPayload } from '@src/domains/TelegramAdminBot/types/telegram-admin-bot.types';

export class TelegramAdminParserService {
  static parse(update: TelegramWebhookPayload) {
    return {
      telegramUserId: update.message?.from?.id || update.callback_query?.from?.id || 0,
      chatId: update.message?.chat?.id || update.callback_query?.message?.chat?.id || 0,
      text: update.message?.text,
      callbackData: update.callback_query?.data
    };
  }

  static toCommand(text?: string, callbackData?: string): TelegramAdminCommand {
    if (callbackData?.startsWith('confirm:')) {
      return { type: 'STOCK_WRITE', requestId: callbackData.split(':')[1] };
    }
    if (!text) return { type: 'UNKNOWN' };
    const parts = text.trim().split(/\s+/).filter(Boolean);
    const command = (parts[0] || '').split('@')[0];
    // Extract code from /start command (e.g., /start WeRetS0eRl95ATWobPWX0AlYYFuOrFNU)
    if (command === '/start') {
      const code = parts[1];
      if (code) {
        if (code.startsWith('LINK_')) {
          return { type: 'CUSTOMER_LINK_START', token: code.substring(5) };
        }
        return { type: 'RECEIPT_START', code };
      }
      return { type: 'START' };
    }
    if (command === '/report') return { type: 'REPORT', date: new Date().toISOString().slice(0, 10) };
    if (command === '/lowstock' || command === '/low_stock') return { type: 'LOWSTOCK' };
    if (command === '/shift_summary') return { type: 'SHIFT_SUMMARY' };
    if (command === '/resend_last_report') return { type: 'RESEND_LAST_REPORT' };
    if (command === '/unlink_bot') return { type: 'UNLINK_BOT' };
    if (command === '/p') return { type: 'PRODUCT_LOOKUP', productCode: parts[1] };
    if (command === '/stock') {
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