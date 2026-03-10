import { InventoryReportService } from '@src/domains/Stock/services/inventory-report.service';
import { ShiftService } from '@src/domains/Shift/services/shift.service';
import { StockLotService } from '@src/domains/Stock/services/stock-lot.service';
import { TelegramService } from '@src/domains/Telegram/services/telegram.service';
import { logger } from '@src/shared/utils/logger';
import { Role } from '@src/shared/config/permissions';
import { formatDate, getStartOfDay } from '@src/shared/utils/date-utils';
import { TelegramAdminFormatService } from './telegram-admin-format.service';
import { TelegramAdminUiService } from './telegram-admin-ui.service';
import { NAV_ROW } from '@src/domains/Telegram/menu/menu-registry';
import type { TelegramAdminCallbackResult } from '@src/domains/TelegramAdminBot/types/telegram-admin-callback.types';

const MARKDOWN = 'Markdown' as const;
const DEFAULT_NEAR_EXPIRY_DAYS = 30;

export class TelegramAdminInventoryService {
  static async sendLowStockList(
    tenantId: number,
    chatId: number,
    adminUserId: number,
    options?: { withNav?: boolean }
  ) {
    const result = await this.buildLowStockMessage(adminUserId, tenantId);
    if (options?.withNav === false) {
      return TelegramAdminUiService.sendMessageWithNav(tenantId, chatId, result.text);
    }
    return TelegramAdminUiService.sendMessageWithNav(tenantId, chatId, result.text);
  }

  static async sendInventoryOnHand(tenantId: number, chatId: number) {
    const result = await this.buildInventoryOnHandMessage(tenantId);
    return TelegramAdminUiService.sendMessageWithNav(tenantId, chatId, result.text);
  }

  static async sendInventoryValue(tenantId: number, chatId: number) {
    const result = await this.buildInventoryValueMessage(tenantId);
    return TelegramAdminUiService.sendMessageWithNav(tenantId, chatId, result.text);
  }

  static async sendReorderAlerts(tenantId: number, chatId: number) {
    const result = await this.buildReorderAlertsMessage(tenantId);
    return TelegramAdminUiService.sendMessageWithNav(tenantId, chatId, result.text);
  }

  static async sendNearExpiryList(tenantId: number, chatId: number, days = DEFAULT_NEAR_EXPIRY_DAYS) {
    const result = await this.buildNearExpiryMessage(days, tenantId);
    return TelegramAdminUiService.sendMessageWithNav(tenantId, chatId, result.text);
  }

  static async sendShiftSummary(tenantId: number, chatId: number, adminUserId: number) {
    const result = await this.buildShiftSummaryMessage(adminUserId, tenantId);
    return TelegramAdminUiService.sendMessageWithNav(tenantId, chatId, result.text);
  }

  static async sendTieredExpiryAlerts(tenantId: number) {
    try {
      const config = await TelegramService.getTelegramConfig(tenantId);
      if (!config || !config.is_active) {
        return;
      }

      // We check for 3 milestones: 30 days, 7 days, and 0 days (today)
      const milestones = [
        { days: 30, title: '⚠️ ការជូនដំណឹង: ទំនិញជិតហួសកំណត់ (នៅសល់ ៣០ ថ្ងៃ)', type: 'ជិតហួសកំណត់' },
        { days: 7, title: '⚠️ ការជូនដំណឹង: ទំនិញជិតហួសកំណត់ (នៅសល់ ៧ ថ្ងៃ)', type: 'ជិតហួសកំណត់បំផុត' },
        { days: 0, title: '🚨 ការជូនដំណឹង: ទំនិញហួសកំណត់នៅថ្ងៃនេះ', type: 'ហួសកំណត់ហើយ' },
      ];

      for (const milestone of milestones) {
        const lots = await StockLotService.listLotsExpiringIn(tenantId, milestone.days);
        if (lots.length > 0) {
          const message = this.formatTieredExpiryMessage(milestone.title, milestone.days, milestone.type, lots);
          await TelegramService.sendCustomMessage(tenantId, message, 'Markdown');
          logger.info(`Telegram tiered expiry alert sent: ${milestone.title}`);
        }
      }
    } catch (error: any) {
      logger.error('Failed to send tiered expiry alerts', {
        error: error.message,
      });
    }
  }

  private static formatTieredExpiryMessage(title: string, days: number, type: string, lots: any[]): string {
    const lines = lots.map((lot, index) => {
      const name = TelegramAdminFormatService.escapeMarkdown(lot.product_name);
      const code = TelegramAdminFormatService.escapeMarkdown(lot.product_code ?? '-');
      const expiredAt = lot.expired_at ? formatDate(new Date(lot.expired_at)) : '-';
      return `${index + 1}) ${name} (${code})
• ចំនួន: ${lot.qty_on_hand}
• ថ្ងៃហួសកំណត់: ${expiredAt}
• ស្ថានភាព: ${type}`;
    });

    return [
      `*${title}*`,
      '',
      ...lines,
    ].join('\n');
  }

  static async sendNearExpiryAlert(tenantId: number) {
    try {
      const config = await TelegramService.getTelegramConfig(tenantId);
      if (!config || !config.is_active) {
        return;
      }

      const report = await StockLotService.listNearExpiry(tenantId, DEFAULT_NEAR_EXPIRY_DAYS);
      if (!report.lots.length) {
        return;
      }

      const result = await this.buildNearExpiryMessage(DEFAULT_NEAR_EXPIRY_DAYS, tenantId);

      // Cleanup message: remove navigation buttons for automated alerts
      const message = result.text;

      await TelegramService.sendCustomMessage(tenantId, message, 'Markdown');
      logger.info('Telegram near-expiry alert sent automatically');
    } catch (error: any) {
      logger.error('Failed to send automated near-expiry alert', {
        error: error.message,
      });
    }
  }

  static async buildLowStockMessage(adminUserId: number, tenantId: number): Promise<TelegramAdminCallbackResult> {
    const report = await InventoryReportService.getLowStock(adminUserId, tenantId);
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
      parseMode: MARKDOWN,
    };
  }

  static async buildInventoryOnHandMessage(tenantId: number): Promise<TelegramAdminCallbackResult> {
    const report = await InventoryReportService.getStockOnHand(tenantId);
    if (!report.summary.total_skus) {
      return {
        text: 'មិនមានទិន្នន័យ',
        replyMarkup: { inline_keyboard: [NAV_ROW] },
        parseMode: MARKDOWN,
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
      parseMode: MARKDOWN,
    };
  }

  static async buildInventoryValueMessage(tenantId: number): Promise<TelegramAdminCallbackResult> {
    const report = await InventoryReportService.getInventoryValue(tenantId);
    if (!report.summary.total_skus) {
      return {
        text: 'មិនមានទិន្នន័យ',
        replyMarkup: { inline_keyboard: [NAV_ROW] },
        parseMode: MARKDOWN,
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
      parseMode: MARKDOWN,
    };
  }

  static async buildReorderAlertsMessage(tenantId: number): Promise<TelegramAdminCallbackResult> {
    const report = await InventoryReportService.getReorderAlerts(tenantId);
    if (!report.items.length) {
      return {
        text: 'មិនមានទិន្នន័យ',
        replyMarkup: { inline_keyboard: [NAV_ROW] },
        parseMode: MARKDOWN,
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
      parseMode: MARKDOWN,
    };
  }

  static async buildNearExpiryMessage(
    days = DEFAULT_NEAR_EXPIRY_DAYS,
    tenantId: number
  ): Promise<TelegramAdminCallbackResult> {
    const report = await StockLotService.listNearExpiry(tenantId, days);

    if (!report.lots.length) {
      return {
        text: 'មិនមានទិន្នន័យ',
        replyMarkup: { inline_keyboard: [NAV_ROW] },
        parseMode: MARKDOWN,
      };
    }

    const today = getStartOfDay(new Date());

    // Group lots by urgency
    const expiredToday: string[] = [];
    const expiringSoon: string[] = [];     // Within 7 days
    const expiringLater: string[] = [];    // Within 30 days

    report.lots.forEach((lot) => {
      const name = TelegramAdminFormatService.escapeMarkdown(lot.product_name);
      const code = TelegramAdminFormatService.escapeMarkdown(lot.product_code ?? '-');
      const expiredAt = lot.expired_at ? formatDate(new Date(lot.expired_at)) : '-';

      const lotLine = `• ${name} (${code}) | ថ្ងែអស់កាលកំណត់: ${expiredAt} | ចំនួន: ${lot.qty_on_hand}`;

      if (!lot.expired_at) return;
      const expDate = new Date(lot.expired_at);

      const diffTime = expDate.getTime() - today.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      if (diffDays <= 0) {
        expiredToday.push(lotLine);
      } else if (diffDays <= 7) {
        expiringSoon.push(lotLine);
      } else {
        expiringLater.push(lotLine);
      }
    });

    const lines: string[] = [];

    if (expiredToday.length > 0) {
      lines.push('🚨 *ទំនិញហួសកំណត់នៅថ្ងៃនេះ ឬបានហួសកំណត់*');
      lines.push(...expiredToday);
      lines.push('');
    }
    if (expiringSoon.length > 0) {
      lines.push('⚠️ *ទំនិញជិតហួសកំណត់ (ក្នុងរយៈពេល ៧ ថ្ងៃ)*');
      lines.push(...expiringSoon);
      lines.push('');
    }
    if (expiringLater.length > 0) {
      lines.push('⏳ *ទំនិញជិតហួសកំណត់ (ក្នុងរយៈពេល ៣០ ថ្ងៃ)*');
      lines.push(...expiringLater);
      lines.push('');
    }

    const message = [
      `📊 *របាយការណ៍ស្តុកជិតផុតកំណត់*`,
      '',
      ...lines,
    ].join('\n');

    return {
      text: message,
      replyMarkup: { inline_keyboard: [NAV_ROW] },
      parseMode: MARKDOWN,
    };
  }

  static async buildShiftSummaryMessage(
    adminUserId: number,
    tenantId: number
  ): Promise<TelegramAdminCallbackResult> {
    const today = formatDate(new Date());
    const response = await ShiftService.listShifts(
      { page: 1, limit: 20, start_date: today, end_date: today },
      adminUserId,
      Role.ADMIN,
      tenantId
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
      parseMode: MARKDOWN,
    };
  }
}
