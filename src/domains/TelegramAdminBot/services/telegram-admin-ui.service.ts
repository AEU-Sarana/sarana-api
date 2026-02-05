import { TelegramService } from '@src/domains/Telegram/services/telegram.service';
import { NAV_ROW } from '@src/domains/Telegram/menu/menu-registry';

export class TelegramAdminUiService {
  static async sendMessageWithNav(
    chatId: number,
    message: string,
    parseMode: 'Markdown' | 'HTML' = 'Markdown'
  ) {
    return TelegramService.sendMenuMessage(chatId, message, {
      inline_keyboard: [NAV_ROW],
    }, parseMode);
  }

  static async sendConfirm(chatId: number, action: string) {
    return TelegramService.sendConfirmKeyboard(chatId, action);
  }
}
