import { TelegramAdminLinkModel } from '@src/domains/TelegramAdminBot/models/telegram-admin-link.model';

export class TelegramAdminLinksService {
  static async requireActiveLink(telegramUserId: number, chatId: number) {
    const link = await TelegramAdminLinkModel.findActive(telegramUserId, chatId);
    if (!link) throw new Error('TELEGRAM_ADMIN_NOT_LINKED');
    await TelegramAdminLinkModel.touch(telegramUserId, chatId);
    return link;
  }

  static async linkAdmin(params: { userId: number; telegramUserId: number; chatId: number }) {
    return TelegramAdminLinkModel.upsertActiveLink(params);
  }
}