import { TelegramService } from '@src/domains/Telegram/services/telegram.service';
import { TelegramAdminReportService } from './telegram-admin-report.service';
import { TelegramAdminInventoryService } from './telegram-admin-inventory.service';
import { TelegramAdminUiService } from './telegram-admin-ui.service';
import { TelegramAdminFormatService } from './telegram-admin-format.service';

export class TelegramAdminMenuActionService {
  static async handleMenuAction(
    actionId: string,
    payload: string | undefined,
    chatId: number,
    adminUserId: number,
    telegramUserId: number
  ) {
    switch (actionId) {
      case 'report': {
        if (payload === 'custom') {
          TelegramAdminReportService.startCustomReportRange(chatId, telegramUserId);
          return TelegramService.sendMessageByChatId(
            chatId,
            TelegramAdminFormatService.buildCustomRangePrompt('report'),
            'Markdown'
          );
        }
        if (!payload) {
          return TelegramService.sendMessageByChatId(
            chatId,
            'Invalid report range.',
            'Markdown'
          );
        }
        return TelegramAdminReportService.sendReportByRange(chatId, payload, adminUserId);
      }
      case 'top_products': {
        if (payload === 'custom') {
          TelegramAdminReportService.startCustomTopRange(chatId, telegramUserId);
          return TelegramService.sendMessageByChatId(
            chatId,
            TelegramAdminFormatService.buildCustomRangePrompt('top'),
            'Markdown'
          );
        }
        if (!payload) {
          return TelegramService.sendMessageByChatId(
            chatId,
            'Invalid range.',
            'Markdown'
          );
        }
        return TelegramAdminReportService.sendTopProductsByRange(chatId, payload, adminUserId);
      }
      case 'slow_products': {
        if (payload === 'custom') {
          TelegramAdminReportService.startCustomSlowRange(chatId, telegramUserId);
          return TelegramService.sendMessageByChatId(
            chatId,
            TelegramAdminFormatService.buildCustomRangePrompt('slow'),
            'Markdown'
          );
        }
        if (!payload) {
          return TelegramService.sendMessageByChatId(
            chatId,
            'Invalid range.',
            'Markdown'
          );
        }
        return TelegramAdminReportService.sendSlowProductsByRange(chatId, payload, adminUserId);
      }
      case 'income': {
        if (payload === 'custom') {
          TelegramAdminReportService.startCustomIncomeRange(chatId, telegramUserId);
          return TelegramService.sendMessageByChatId(
            chatId,
            TelegramAdminFormatService.buildCustomRangePrompt('income'),
            'Markdown'
          );
        }
        if (!payload) {
          return TelegramService.sendMessageByChatId(
            chatId,
            'Invalid range.',
            'Markdown'
          );
        }
        return TelegramAdminReportService.sendIncomeByRange(chatId, payload, adminUserId);
      }
      case 'inventory_on_hand':
        return TelegramAdminInventoryService.sendInventoryOnHand(chatId);
      case 'inventory_value':
        return TelegramAdminInventoryService.sendInventoryValue(chatId);
      case 'inventory_low_stock':
        return TelegramAdminInventoryService.sendLowStockList(chatId, adminUserId, { withNav: true });
      case 'inventory_reorder':
        return TelegramAdminInventoryService.sendReorderAlerts(chatId);
      case 'inventory_near_expiry':
        return TelegramAdminInventoryService.sendNearExpiryList(chatId);
      case 'shift_summary':
        return TelegramAdminInventoryService.sendShiftSummary(chatId, adminUserId);
      case 'resend_last_report':
        return TelegramAdminUiService.sendConfirm(chatId, 'RESEND_LAST_REPORT');
      case 'export_excel':
        return TelegramService.sendMessageByChatId(chatId, '⏳ Processing...', 'Markdown');
      default:
        return { sent: false };
    }
  }
}
