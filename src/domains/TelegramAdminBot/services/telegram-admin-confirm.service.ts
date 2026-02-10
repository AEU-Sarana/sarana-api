import { TelegramService } from '@src/domains/Telegram/services/telegram.service';
import { TelegramAdminReportService } from './telegram-admin-report.service';
import prisma from '@src/database/client';

export class TelegramAdminConfirmService {
  static buildConfirmPrompt(action: string) {
    return {
      text: 'Please confirm this action.',
      replyMarkup: {
        inline_keyboard: [
          [
            { text: 'Confirm', callback_data: `CONFIRM:${action}` },
            { text: 'Cancel', callback_data: 'CONFIRM:CANCEL' },
          ],
        ],
      },
      parseMode: 'Markdown' as const,
    };
  }

  static async executeConfirmedAction(
    chatId: number,
    action: string,
    adminUserId: number
  ) {
    if (action === 'CANCEL') {
      return TelegramService.sendMessageByChatId(chatId, 'Cancelled.', 'Markdown');
    }
    if (action === 'RESEND_LAST_REPORT') {
      return TelegramAdminReportService.sendReportByRange(chatId, 'today', adminUserId);
    }
    if (action === 'UNLINK_BOT') {
      await prisma.telegramAdminLink.updateMany({
        where: { chatId: BigInt(chatId), status: 'ACTIVE' },
        data: { status: 'REVOKED', revokedAt: new Date() }
      });
      return TelegramService.sendMessageByChatId(chatId, 'Bot ត្រូវបានផ្ដាច់ការភ្ជាប់ជោគជ័យ។', 'Markdown');
    }
  }
}
