import { TelegramService } from '@src/domains/Telegram/services/telegram.service';
import { NAV_ROW } from '@src/domains/Telegram/menu/menu-registry';

export class TelegramAdminUiService {
  static async sendMessageWithNav(
    tenantId: number,
    chatId: number,
    message: string,
    parseMode: 'Markdown' | 'HTML' = 'Markdown'
  ) {
    return TelegramService.sendMenuMessage(tenantId, chatId, message, {
      inline_keyboard: [NAV_ROW],
    }, parseMode);
  }

  static async sendConfirm(tenantId: number, chatId: number, action: string) {
    return TelegramService.sendConfirmKeyboard(tenantId, chatId, action);
  }
}
