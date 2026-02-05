import { InventoryReportService } from '@src/domains/Stock/services/inventory-report.service';
import { ShiftService } from '@src/domains/Shift/services/shift.service';
import { Role } from '@src/shared/config/permissions';
import { formatDate } from '@src/shared/utils/date-utils';
import { TelegramAdminFormatService } from './telegram-admin-format.service';
import { TelegramAdminUiService } from './telegram-admin-ui.service';
import { NAV_ROW } from '@src/domains/Telegram/menu/menu-registry';
import type { TelegramAdminCallbackResult } from '@src/domains/TelegramAdminBot/types/telegram-admin-callback.types';

export class TelegramAdminInventoryService {
  static async sendLowStockList(
    chatId: number,
    adminUserId: number,
    options?: { withNav?: boolean }
  ) {
    const result = await this.buildLowStockMessage(adminUserId);
    if (options?.withNav === false) {
      return TelegramAdminUiService.sendMessageWithNav(chatId, result.text);
    }
    return TelegramAdminUiService.sendMessageWithNav(chatId, result.text);
  }

  static async sendInventoryOnHand(chatId: number) {
    const result = await this.buildInventoryOnHandMessage();
    return TelegramAdminUiService.sendMessageWithNav(chatId, result.text);
  }

  static async sendInventoryValue(chatId: number) {
    const result = await this.buildInventoryValueMessage();
    return TelegramAdminUiService.sendMessageWithNav(chatId, result.text);
  }

  static async sendReorderAlerts(chatId: number) {
    const result = await this.buildReorderAlertsMessage();
    return TelegramAdminUiService.sendMessageWithNav(chatId, result.text);
  }

  static async sendShiftSummary(chatId: number, adminUserId: number) {
    const result = await this.buildShiftSummaryMessage(adminUserId);
    return TelegramAdminUiService.sendMessageWithNav(chatId, result.text);
  }

  static async buildLowStockMessage(adminUserId: number): Promise<TelegramAdminCallbackResult> {
    const report = await InventoryReportService.getLowStock(adminUserId);
    const lines = report.stock_report.map((item, index) => {
      const name = TelegramAdminFormatService.escapeMarkdown(item.product_name);
      const code = TelegramAdminFormatService.escapeMarkdown(item.product_code ?? '-');
      return `${index + 1}) ${name} (${code}) - ${item.current_stock}`;
    });
    const summary = report.summary;
    const message = [
      '⚠️Low stock items',
      `Total products: ${summary.total_products}`,
      `Low stock: ${summary.low_stock_count}`,
      `Out of stock: ${summary.out_of_stock_count}`,
      `Negative stock: ${summary.negative_stock_count}`,
      '',
      lines.length ? lines.join('\n') : 'No low stock items.',
    ].join('\n');

    return {
      text: message,
      replyMarkup: { inline_keyboard: [NAV_ROW] },
      parseMode: 'Markdown',
    };
  }

  static async buildInventoryOnHandMessage(): Promise<TelegramAdminCallbackResult> {
    const report = await InventoryReportService.getStockOnHand();
    if (!report.summary.total_skus) {
      return {
        text: 'មិនមានទិន្នន័យ',
        replyMarkup: { inline_keyboard: [NAV_ROW] },
        parseMode: 'Markdown',
      };
    }

    const lines = report.items.map((item, index) => {
      const name = TelegramAdminFormatService.escapeMarkdown(item.product_name);
      const code = TelegramAdminFormatService.escapeMarkdown(item.product_code ?? '-');
      return `${index + 1}) ${name} (${code}) - ${item.quantity}`;
    });

    const message = [
      '📦 *ស្តុកនៅសល់*',
      `• ចំនួន SKU: ${report.summary.total_skus}`,
      `• ចំនួនសរុប: ${report.summary.total_qty}`,
      '',
      ...(lines.length ? lines : ['មិនមានទិន្នន័យ']),
    ].join('\n');

    return {
      text: message,
      replyMarkup: { inline_keyboard: [NAV_ROW] },
      parseMode: 'Markdown',
    };
  }

  static async buildInventoryValueMessage(): Promise<TelegramAdminCallbackResult> {
    const report = await InventoryReportService.getInventoryValue();
    if (!report.summary.total_skus) {
      return {
        text: 'មិនមានទិន្នន័យ',
        replyMarkup: { inline_keyboard: [NAV_ROW] },
        parseMode: 'Markdown',
      };
    }

    const totalValue = report.summary.total_value.toFixed(2);
    const lines = report.items.map((item, index) => {
      const name = TelegramAdminFormatService.escapeMarkdown(item.product_name);
      const code = TelegramAdminFormatService.escapeMarkdown(item.product_code ?? '-');
      return `${index + 1}) ${name} (${code})
• ចំនួន: ${item.quantity}
• តម្លៃ: $${item.total_value.toFixed(2)}`;
    });

    const message = [
      '💰 *តម្លៃស្តុកសរុប*',
      `• តម្លៃស្តុកសរុប: $${totalValue}`,
      `• ចំនួន SKU: ${report.summary.total_skus}`,
      `• ចំនួនសរុប: ${report.summary.total_qty}`,
      '',
      ...(lines.length ? lines : ['មិនមានទិន្នន័យ']),
    ].join('\n');

    return {
      text: message,
      replyMarkup: { inline_keyboard: [NAV_ROW] },
      parseMode: 'Markdown',
    };
  }

  static async buildReorderAlertsMessage(): Promise<TelegramAdminCallbackResult> {
    const report = await InventoryReportService.getReorderAlerts();
    if (!report.items.length) {
      return {
        text: 'មិនមានទិន្នន័យ',
        replyMarkup: { inline_keyboard: [NAV_ROW] },
        parseMode: 'Markdown',
      };
    }

    const lines = report.items.map((item, index) => {
      const name = TelegramAdminFormatService.escapeMarkdown(item.product_name);
      const code = TelegramAdminFormatService.escapeMarkdown(item.product_code ?? '-');
      return `${index + 1}) ${name} (${code})
• ស្តុកនៅសល់: ${item.quantity}
• កម្រិតបញ្ជាទិញឡើងវិញ: ${item.reorder_point}`;
    });

    const message = [
      '🚨 *ស្តុកជិតអស់*',
      '',
      ...lines,
    ].join('\n');

    return {
      text: message,
      replyMarkup: { inline_keyboard: [NAV_ROW] },
      parseMode: 'Markdown',
    };
  }

  static async buildShiftSummaryMessage(
    adminUserId: number
  ): Promise<TelegramAdminCallbackResult> {
    const today = formatDate(new Date());
    const response = await ShiftService.listShifts(
      { page: 1, limit: 20, start_date: today, end_date: today },
      adminUserId,
      Role.ADMIN
    );

    const lines = response.shifts.map((shift, index) => {
      const start = shift.start_time
        ? new Date(shift.start_time).toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: false,
          })
        : '-';
      const end = shift.end_time
        ? new Date(shift.end_time).toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: false,
          })
        : '-';
      return `${index + 1}) ${shift.seller_name ?? 'Unknown'} - ${shift.status}
• Sales: $${Number(shift.total_sales_amount).toLocaleString()} (${shift.total_sales_count} orders)
• Time: ${start} - ${end}`;
    });

    const message = [
      `📋 *Shift Summary* (${today})`,
      '',
      lines.length ? lines.join('\n\n') : 'No shifts found for today.',
    ].join('\n');

    return {
      text: message,
      replyMarkup: { inline_keyboard: [NAV_ROW] },
      parseMode: 'Markdown',
    };
  }
}
