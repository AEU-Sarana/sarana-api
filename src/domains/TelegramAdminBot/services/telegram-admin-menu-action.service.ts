import { TelegramService } from '@src/domains/Telegram/services/telegram.service';
import { TelegramAdminReportService } from './telegram-admin-report.service';
import { TelegramAdminInventoryService } from './telegram-admin-inventory.service';
import { TelegramAdminFormatService } from './telegram-admin-format.service';

export class TelegramAdminMenuActionService {
  static async handleMenuAction(
    actionId: string,
    payload: string | undefined,
    chatId: number,
    adminUserId: number,
    telegramUserId: number,
    tenantId: number
  ) {
    switch (actionId) {
      case 'report': {
        if (payload === 'custom') {
          TelegramAdminReportService.startCustomReportRange(chatId, telegramUserId);
          return TelegramService.sendMessageByChatId(
            tenantId,
            chatId,
            TelegramAdminFormatService.buildCustomRangePrompt('report'),
            'Markdown'
          );
        }
        if (!payload) {
          return TelegramService.sendMessageByChatId(
            tenantId,
            chatId,
            'Invalid report range.',
            'Markdown'
          );
        }
        return TelegramAdminReportService.sendReportByRange(tenantId, chatId, payload, adminUserId);
      }
      case 'top_products': {
        if (payload === 'custom') {
          TelegramAdminReportService.startCustomTopRange(chatId, telegramUserId);
          return TelegramService.sendMessageByChatId(
            tenantId,
            chatId,
            TelegramAdminFormatService.buildCustomRangePrompt('top'),
            'Markdown'
          );
        }
        if (!payload) {
          return TelegramService.sendMessageByChatId(
            tenantId,
            chatId,
            'Invalid range.',
            'Markdown'
          );
        }
        return TelegramAdminReportService.sendTopProductsByRange(tenantId, chatId, payload, adminUserId);
      }
      case 'slow_products': {
        if (payload === 'custom') {
          TelegramAdminReportService.startCustomSlowRange(chatId, telegramUserId);
          return TelegramService.sendMessageByChatId(
            tenantId,
            chatId,
            TelegramAdminFormatService.buildCustomRangePrompt('slow'),
            'Markdown'
          );
        }
        if (!payload) {
          return TelegramService.sendMessageByChatId(
            tenantId,
            chatId,
            'Invalid range.',
            'Markdown'
          );
        }
        return TelegramAdminReportService.sendSlowProductsByRange(tenantId, chatId, payload, adminUserId);
      }
      case 'income': {
        if (payload === 'custom') {
          TelegramAdminReportService.startCustomIncomeRange(chatId, telegramUserId);
          return TelegramService.sendMessageByChatId(
            tenantId,
            chatId,
            TelegramAdminFormatService.buildCustomRangePrompt('income'),
            'Markdown'
          );
        }
        if (!payload) {
          return TelegramService.sendMessageByChatId(
            tenantId,
            chatId,
            'Invalid range.',
            'Markdown'
          );
        }
        return TelegramAdminReportService.sendIncomeByRange(tenantId, chatId, payload, adminUserId);
      }
      case 'inventory_on_hand':
        return TelegramAdminInventoryService.sendInventoryOnHand(tenantId, chatId);
      case 'inventory_value':
        return TelegramAdminInventoryService.sendInventoryValue(tenantId, chatId);
      case 'inventory_low_stock':
        return TelegramAdminInventoryService.sendLowStockList(tenantId, chatId, adminUserId, { withNav: true });
      case 'inventory_reorder':
        return TelegramAdminInventoryService.sendReorderAlerts(tenantId, chatId);
      case 'inventory_near_expiry':
        return TelegramAdminInventoryService.sendNearExpiryList(tenantId, chatId);
      case 'export_excel':
        return TelegramService.sendMessageByChatId(tenantId, chatId, '⏳ Processing...', 'Markdown');
      default:
        return { sent: false };
    }
  }
}
