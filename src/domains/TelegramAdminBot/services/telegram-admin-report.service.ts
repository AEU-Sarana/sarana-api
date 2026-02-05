import { ReportService } from '@src/domains/Report/services/report.service';
import { Role } from '@src/shared/config/permissions';
import { formatDate, subtractDaysFromDate } from '@src/shared/utils/date-utils';
import { startOfMonth, startOfWeek, startOfYear } from 'date-fns';
import prisma from '@src/database/client';
import { Prisma } from '@src/database/generated';
import { calculateProfit } from '@src/domains/Report/utils/income-math';
import { logger } from '@src/shared/utils/logger';
import { TelegramService } from '@src/domains/Telegram/services/telegram.service';
import { NAV_ROW } from '@src/domains/Telegram/menu/menu-registry';
import {
  MAX_CUSTOM_RANGE_DAYS,
  MAX_INCOME_RANGE_DAYS,
  MAX_SLOW_PRODUCTS_RANGE_DAYS,
  MAX_TOP_PRODUCTS_RANGE_DAYS,
  clearAllRangePending,
  getPendingKey,
  pendingIncomeRanges,
  pendingReportRanges,
  pendingSlowProductsRanges,
  pendingTopProductsRanges,
} from './telegram-admin-state.service';
import { TelegramAdminFormatService } from './telegram-admin-format.service';
import type { TelegramAdminCallbackResult } from '@src/domains/TelegramAdminBot/types/telegram-admin-callback.types';

const MARKDOWN = 'Markdown' as const;

export class TelegramAdminReportService {
  static async handleReportCommand(
    chatId: number,
    args: string[],
    adminUserId: number,
    telegramUserId: number
  ) {
    const result = await this.handleReportCommandResult(
      chatId,
      args,
      adminUserId,
      telegramUserId
    );
    return this.sendResult(chatId, result);
  }

  static async handleReportCommandResult(
    chatId: number,
    args: string[],
    adminUserId: number,
    telegramUserId: number
  ): Promise<TelegramAdminCallbackResult> {
    if (args[0] === 'custom') {
      const key = getPendingKey(chatId);
      pendingReportRanges.set(key, { step: 'START', telegramUserId });
      return {
        text: TelegramAdminFormatService.buildCustomRangePrompt('report'),
        parseMode: MARKDOWN,
      };
    }

    if (
      args.length === 2 &&
      TelegramAdminFormatService.isValidDate(args[0]) &&
      TelegramAdminFormatService.isValidDate(args[1])
    ) {
      return this.buildReportMessageByDateRange(args[0], args[1], adminUserId, {
        maxDays: MAX_CUSTOM_RANGE_DAYS,
      });
    }

    const range = args.join('_');
    return this.buildReportMessageByRange(range || 'today', adminUserId);
  }

  static async sendReportByRange(chatId: number, range: string, adminUserId: number) {
    const result = await this.buildReportMessageByRange(range, adminUserId);
    return this.sendResult(chatId, result);
  }

  static resolveReportRange(
    range: string
  ): { startDate: string; endDate: string } | null {
    const normalized = range.trim().toLowerCase();
    const today = new Date();
    if (!normalized || normalized === 'today') {
      const date = formatDate(today);
      return { startDate: date, endDate: date };
    }
    if (normalized === 'yesterday') {
      const date = formatDate(subtractDaysFromDate(today, 1));
      return { startDate: date, endDate: date };
    }
    if (normalized === 'this_week') {
      const start = formatDate(startOfWeek(today, { weekStartsOn: 1 }));
      const end = formatDate(today);
      return { startDate: start, endDate: end };
    }
    if (normalized === 'this_month') {
      const start = formatDate(startOfMonth(today));
      const end = formatDate(today);
      return { startDate: start, endDate: end };
    }
    if (normalized === 'this_year') {
      const start = formatDate(startOfYear(today));
      const end = formatDate(today);
      return { startDate: start, endDate: end };
    }
    if (normalized === 'last_7_days') {
      const start = formatDate(subtractDaysFromDate(today, 6));
      const end = formatDate(today);
      return { startDate: start, endDate: end };
    }
    if (TelegramAdminFormatService.isValidDate(range)) {
      return { startDate: range, endDate: range };
    }
    return null;
  }

  static async sendReportByDateRange(
    chatId: number,
    startDate: string,
    endDate: string,
    adminUserId: number,
    options?: { maxDays?: number }
  ) {
    const result = await this.buildReportMessageByDateRange(
      startDate,
      endDate,
      adminUserId,
      options
    );
    return this.sendResult(chatId, result);
  }

  static async buildReportMessageByRange(
    range: string,
    adminUserId: number
  ): Promise<TelegramAdminCallbackResult> {
    const resolved = this.resolveReportRange(range);
    if (!resolved) {
      return {
        text:
          'Invalid report range. Use `today`, `yesterday`, `this_week`, `this_month`, `this_year`, or `YYYY-MM-DD`.',
        parseMode: MARKDOWN,
      };
    }

    return this.buildReportMessageByDateRange(
      resolved.startDate,
      resolved.endDate,
      adminUserId
    );
  }

  static async buildReportMessageByDateRange(
    startDate: string,
    endDate: string,
    adminUserId: number,
    options?: { maxDays?: number }
  ): Promise<TelegramAdminCallbackResult> {
    if (
      !TelegramAdminFormatService.isValidDate(startDate) ||
      !TelegramAdminFormatService.isValidDate(endDate)
    ) {
      return { text: 'Invalid date format. Use YYYY-MM-DD.', parseMode: MARKDOWN };
    }

    const start = new Date(`${startDate}T00:00:00Z`);
    const end = new Date(`${endDate}T00:00:00Z`);
    if (isNaN(start.getTime()) || isNaN(end.getTime()) || start > end) {
      return {
        text: 'Invalid date range. Ensure start_date <= end_date.',
        parseMode: MARKDOWN,
      };
    }

    const diffDays =
      Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    if (options?.maxDays && diffDays > options.maxDays) {
      return {
        text: `Date range too long. Max ${options.maxDays} days.`,
        parseMode: MARKDOWN,
      };
    }

    const includeDaily = diffDays <= MAX_CUSTOM_RANGE_DAYS;
    const limit = includeDaily ? diffDays : 1;
    const report = await ReportService.getSalesHistoryReport(
      {
        start_date: startDate,
        end_date: endDate,
        page: 1,
        limit,
      },
      adminUserId,
      Role.ADMIN
    );

    const summary = report.summary;
    const header = [
      '📊 *របាយការណ៍លក់*',
      `🗓️ រយៈពេល៖ ${startDate} ដល់ ${endDate} (${diffDays} ថ្ងៃ)`,
      '',
      `•ចំណូលសរុប៖ $${summary.total_sales.toLocaleString()}`,
      `•ចំនួនការបញ្ជាទិញ៖ ${summary.total_orders} ដង`,
      `•ចំណូលមធ្យមក្នុងមួយថ្ងៃ៖ $${summary.average_daily_sales.toFixed(2)}`,
    ];

    const dailyLines = includeDaily
      ? report.sales.map((item, index) => {
          return `${index + 1}) ${item.date} - $${item.total_sales.toLocaleString()} (${item.total_orders} orders)`;
        })
      : [];

    const message = [
      ...header,
      ...(dailyLines.length ? ['', ...dailyLines] : []),
    ].join('\n');

    return {
      text: message,
      replyMarkup: { inline_keyboard: [NAV_ROW] },
      parseMode: MARKDOWN,
    };
  }

  static async handleReportRangeInput(
    pendingKey: string,
    chatId: number,
    text: string,
    adminUserId: number,
    telegramUserId: number
  ) {
    const result = await this.handleReportRangeInputResult(
      pendingKey,
      chatId,
      text,
      adminUserId,
      telegramUserId
    );
    if (!result) return;
    return this.sendResult(chatId, result);
  }

  static async handleReportRangeInputResult(
    pendingKey: string,
    chatId: number,
    text: string,
    adminUserId: number,
    telegramUserId: number
  ): Promise<TelegramAdminCallbackResult | undefined> {
    const input = text.trim();
    if (input.startsWith('/')) {
      const parts = input.split(/\s+/).filter(Boolean);
      const command = (parts[0] || '').split('@')[0].toLowerCase();
      const args = parts.slice(1);

      if (command === '/cancel') {
        pendingReportRanges.delete(pendingKey);
        return { text: 'Report request cancelled.', parseMode: MARKDOWN };
      }

      if (command === '/report') {
        pendingReportRanges.delete(pendingKey);
        if (args.length >= 1) {
          if (
            args.length === 2 &&
            TelegramAdminFormatService.isValidDate(args[0]) &&
            TelegramAdminFormatService.isValidDate(args[1])
          ) {
            return this.buildReportMessageByDateRange(args[0], args[1], adminUserId, {
              maxDays: MAX_CUSTOM_RANGE_DAYS,
            });
          }
          const range = args.join('_');
          return this.buildReportMessageByRange(range, adminUserId);
        }

        const dates = input.match(/\d{4}-\d{2}-\d{2}/g) || [];
        if (dates.length >= 2) {
          const [startDate, endDate] = dates;
          if (!startDate || !endDate) {
            return {
              text: 'Please provide a valid date range. Example: /report 2026-01-01 2026-01-30',
              parseMode: MARKDOWN,
            };
          }
          return this.buildReportMessageByDateRange(startDate, endDate, adminUserId, {
            maxDays: MAX_CUSTOM_RANGE_DAYS,
          });
        }
        if (dates.length === 1) {
          return this.buildReportMessageByRange(dates[0], adminUserId);
        }

        return {
          text: 'Please provide a date or range. Example: /report 2026-01-01 2026-01-30',
          parseMode: MARKDOWN,
        };
      }

      return {
        text: 'Report range pending. Send /cancel to stop.',
        parseMode: MARKDOWN,
      };
    }

    const pending = pendingReportRanges.get(pendingKey);
    if (!pending) return;
    if (pending.telegramUserId !== telegramUserId) {
      return {
        text:
          'Another user is completing a custom report. Please wait or use /report custom after it finishes.',
        parseMode: MARKDOWN,
      };
    }

    if (pending.step === 'START') {
      if (!TelegramAdminFormatService.isValidDate(input)) {
        return { text: 'Invalid start date. Use YYYY-MM-DD.', parseMode: MARKDOWN };
      }
      pendingReportRanges.set(pendingKey, {
        step: 'END',
        startDate: input,
        telegramUserId: pending.telegramUserId,
      });
      return { text: 'Please enter end date (YYYY-MM-DD).', parseMode: MARKDOWN };
    }

    if (!TelegramAdminFormatService.isValidDate(input) || !pending.startDate) {
      return { text: 'Invalid end date. Use YYYY-MM-DD.', parseMode: MARKDOWN };
    }

    const startDate = pending.startDate;
    pendingReportRanges.delete(pendingKey);
    return this.buildReportMessageByDateRange(startDate, input, adminUserId, {
      maxDays: MAX_CUSTOM_RANGE_DAYS,
    });
  }

  static async handleTopProductsRangeInput(
    pendingKey: string,
    chatId: number,
    text: string,
    adminUserId: number,
    telegramUserId: number
  ) {
    const result = await this.handleTopProductsRangeInputResult(
      pendingKey,
      chatId,
      text,
      adminUserId,
      telegramUserId
    );
    if (!result) return;
    return this.sendResult(chatId, result);
  }

  static async handleTopProductsRangeInputResult(
    pendingKey: string,
    chatId: number,
    text: string,
    adminUserId: number,
    telegramUserId: number
  ): Promise<TelegramAdminCallbackResult | undefined> {
    const input = text.trim();
    if (input.startsWith('/')) {
      const parts = input.split(/\s+/).filter(Boolean);
      const command = (parts[0] || '').split('@')[0].toLowerCase();
      const args = parts.slice(1);

      if (command === '/cancel') {
        pendingTopProductsRanges.delete(pendingKey);
        return { text: 'Report request cancelled.', parseMode: MARKDOWN };
      }

      if (command === '/top' || command === '/top_products') {
        pendingTopProductsRanges.delete(pendingKey);
        if (args.length >= 1) {
          if (
            args.length === 2 &&
            TelegramAdminFormatService.isValidDate(args[0]) &&
            TelegramAdminFormatService.isValidDate(args[1])
          ) {
            return this.buildTopProductsMessageByDateRange(args[0], args[1], adminUserId, {
              maxDays: MAX_TOP_PRODUCTS_RANGE_DAYS,
            });
          }
          const range = args.join('_');
          return this.buildTopProductsMessageByRange(range, adminUserId);
        }

        const dates = input.match(/\d{4}-\d{2}-\d{2}/g) || [];
        if (dates.length >= 2) {
          const [startDate, endDate] = dates;
          if (!startDate || !endDate) {
            return {
              text: 'Please provide a valid date range. Example: /top 2026-01-01 2026-01-30',
              parseMode: MARKDOWN,
            };
          }
          return this.buildTopProductsMessageByDateRange(startDate, endDate, adminUserId, {
            maxDays: MAX_TOP_PRODUCTS_RANGE_DAYS,
          });
        }
        if (dates.length === 1) {
          return this.buildTopProductsMessageByRange(dates[0], adminUserId);
        }

        return {
          text: 'Please provide a date or range. Example: /top 2026-01-01 2026-01-30',
          parseMode: MARKDOWN,
        };
      }

      return { text: 'Top products range pending. Send /cancel to stop.', parseMode: MARKDOWN };
    }

    const pending = pendingTopProductsRanges.get(pendingKey);
    if (!pending) return;
    if (pending.telegramUserId !== telegramUserId) {
      return {
        text: 'Another user is completing a custom report. Please wait.',
        parseMode: MARKDOWN,
      };
    }

    if (pending.step === 'START') {
      if (!TelegramAdminFormatService.isValidDate(input)) {
        return { text: 'Invalid start date. Use YYYY-MM-DD.', parseMode: MARKDOWN };
      }
      pendingTopProductsRanges.set(pendingKey, {
        step: 'END',
        startDate: input,
        telegramUserId: pending.telegramUserId,
      });
      return { text: 'Please enter end date (YYYY-MM-DD).', parseMode: MARKDOWN };
    }

    if (!TelegramAdminFormatService.isValidDate(input) || !pending.startDate) {
      return { text: 'Invalid end date. Use YYYY-MM-DD.', parseMode: MARKDOWN };
    }

    const startDate = pending.startDate;
    pendingTopProductsRanges.delete(pendingKey);
    return this.buildTopProductsMessageByDateRange(startDate, input, adminUserId, {
      maxDays: MAX_TOP_PRODUCTS_RANGE_DAYS,
    });
  }

  static async sendTopProductsByRange(
    chatId: number,
    range: string,
    adminUserId: number
  ) {
    const result = await this.buildTopProductsMessageByRange(range, adminUserId);
    return this.sendResult(chatId, result);
  }

  static async sendTopProductsByDateRange(
    chatId: number,
    startDate: string,
    endDate: string,
    adminUserId: number,
    options?: { maxDays?: number }
  ) {
    const result = await this.buildTopProductsMessageByDateRange(
      startDate,
      endDate,
      adminUserId,
      options
    );
    return this.sendResult(chatId, result);
  }

  static async buildTopProductsMessageByRange(
    range: string,
    adminUserId: number
  ): Promise<TelegramAdminCallbackResult> {
    const resolved = this.resolveReportRange(range);
    if (!resolved) {
      return {
        text: 'Invalid range. Use today, yesterday, this_week, this_month, this_year, or YYYY-MM-DD.',
        parseMode: MARKDOWN,
      };
    }

    if (resolved.startDate === resolved.endDate) {
      const report = await ReportService.getDailyReport(
        { date: resolved.startDate },
        adminUserId,
        Role.ADMIN
      );
      return this.buildTopProductsMessage(resolved.startDate, resolved.endDate, report.top_products);
    }

    return this.buildTopProductsMessageByDateRange(
      resolved.startDate,
      resolved.endDate,
      adminUserId
    );
  }

  static async buildTopProductsMessageByDateRange(
    startDate: string,
    endDate: string,
    adminUserId: number,
    options?: { maxDays?: number }
  ): Promise<TelegramAdminCallbackResult> {
    if (
      !TelegramAdminFormatService.isValidDate(startDate) ||
      !TelegramAdminFormatService.isValidDate(endDate)
    ) {
      return { text: 'Invalid date format. Use YYYY-MM-DD.', parseMode: MARKDOWN };
    }

    const start = new Date(`${startDate}T00:00:00Z`);
    const end = new Date(`${endDate}T23:59:59Z`);
    if (isNaN(start.getTime()) || isNaN(end.getTime()) || start > end) {
      return {
        text: 'Invalid date range. Ensure start_date <= end_date.',
        parseMode: MARKDOWN,
      };
    }

    const diffDays =
      Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    if (options?.maxDays && diffDays > options.maxDays) {
      return {
        text: `Date range too long. Max ${options.maxDays} days.`,
        parseMode: MARKDOWN,
      };
    }

    const topProductsRaw = await prisma.orderItem.groupBy({
      by: ['productId'],
      where: {
        order: {
          orderDate: {
            gte: start,
            lte: end,
          },
        },
      },
      _sum: { quantity: true, subtotal: true },
      _count: { orderItemId: true },
      orderBy: { _sum: { subtotal: 'desc' } },
      take: 10,
    });

    if (!topProductsRaw.length) {
      return { text: 'No sales found for this range.', parseMode: MARKDOWN };
    }

    const productIds = topProductsRaw.map((p) => p.productId);
    const products = await prisma.product.findMany({
      where: { productId: { in: productIds } },
      select: { productId: true, productName: true, productCode: true, price: true },
    });
    const productMap = new Map(products.map((p) => [p.productId, p]));

    const topProducts = topProductsRaw.map((p) => {
      const product = productMap.get(p.productId);
      const quantitySold = Number(p._sum.quantity || 0);
      const revenue = Number(p._sum.subtotal || 0);
      const averagePrice = quantitySold > 0 ? revenue / quantitySold : Number(product?.price || 0);
      return {
        product_id: p.productId,
        product_name: product?.productName || 'Unknown Product',
        product_code: product?.productCode || 'N/A',
        quantity_sold: quantitySold,
        revenue,
        average_price: Number(averagePrice.toFixed(2)),
      };
    });

    return this.buildTopProductsMessage(startDate, endDate, topProducts);
  }

  private static buildTopProductsMessage(
    startDate: string,
    endDate: string,
    topProducts: Array<{
      product_id: number;
      product_name: string;
      product_code: string;
      quantity_sold: number;
      revenue: number;
      average_price: number;
    }>
  ) {
    const header = [
      '🏆 *ទំនិញលក់ដាច់បំផុត*',
      `📅 Range: ${startDate} → ${endDate}`,
      '',
    ];

    const lines = topProducts.map((p, index) => {
      const name = TelegramAdminFormatService.escapeMarkdown(p.product_name);
      return `${index + 1}) ${name}
        •បរិមាណលក់: ${p.quantity_sold}
        •ចំណូល: $${p.revenue.toLocaleString()}
        •តម្លៃមធ្យម: $${p.average_price.toFixed(2)}`;
    });

    return {
      text: [...header, ...lines].join('\n'),
      replyMarkup: { inline_keyboard: [NAV_ROW] },
      parseMode: MARKDOWN,
    };
  }

  static async handleSlowProductsRangeInput(
    pendingKey: string,
    chatId: number,
    text: string,
    adminUserId: number,
    telegramUserId: number
  ) {
    const result = await this.handleSlowProductsRangeInputResult(
      pendingKey,
      chatId,
      text,
      adminUserId,
      telegramUserId
    );
    if (!result) return;
    return this.sendResult(chatId, result);
  }

  static async handleSlowProductsRangeInputResult(
    pendingKey: string,
    chatId: number,
    text: string,
    adminUserId: number,
    telegramUserId: number
  ): Promise<TelegramAdminCallbackResult | undefined> {
    const input = text.trim();
    if (input.startsWith('/')) {
      const parts = input.split(/\s+/).filter(Boolean);
      const command = (parts[0] || '').split('@')[0].toLowerCase();
      const args = parts.slice(1);

      if (command === '/cancel') {
        pendingSlowProductsRanges.delete(pendingKey);
        return { text: 'Report request cancelled.', parseMode: MARKDOWN };
      }

      if (command === '/slow' || command === '/slow_products') {
        pendingSlowProductsRanges.delete(pendingKey);
        if (args.length >= 1) {
          if (
            args.length === 2 &&
            TelegramAdminFormatService.isValidDate(args[0]) &&
            TelegramAdminFormatService.isValidDate(args[1])
          ) {
            return this.buildSlowProductsMessageByDateRange(args[0], args[1], adminUserId, {
              maxDays: MAX_SLOW_PRODUCTS_RANGE_DAYS,
            });
          }
          const range = args.join('_');
          return this.buildSlowProductsMessageByRange(range, adminUserId);
        }

        const dates = input.match(/\d{4}-\d{2}-\d{2}/g) || [];
        if (dates.length >= 2) {
          const [startDate, endDate] = dates;
          if (!startDate || !endDate) {
            return {
              text: 'Please provide a valid date range. Example: /slow 2026-01-01 2026-01-30',
              parseMode: MARKDOWN,
            };
          }
          return this.buildSlowProductsMessageByDateRange(startDate, endDate, adminUserId, {
            maxDays: MAX_SLOW_PRODUCTS_RANGE_DAYS,
          });
        }
        if (dates.length === 1) {
          return this.buildSlowProductsMessageByRange(dates[0], adminUserId);
        }

        return {
          text: 'Please provide a date or range. Example: /slow 2026-01-01 2026-01-30',
          parseMode: MARKDOWN,
        };
      }

      return { text: 'Slow products range pending. Send /cancel to stop.', parseMode: MARKDOWN };
    }

    const pending = pendingSlowProductsRanges.get(pendingKey);
    if (!pending) return;
    if (pending.telegramUserId !== telegramUserId) {
      return {
        text: 'Another user is completing a custom report. Please wait.',
        parseMode: MARKDOWN,
      };
    }

    if (pending.step === 'START') {
      if (!TelegramAdminFormatService.isValidDate(input)) {
        return { text: 'Invalid start date. Use YYYY-MM-DD.', parseMode: MARKDOWN };
      }
      pendingSlowProductsRanges.set(pendingKey, {
        step: 'END',
        startDate: input,
        telegramUserId: pending.telegramUserId,
      });
      return { text: 'Please enter end date (YYYY-MM-DD).', parseMode: MARKDOWN };
    }

    if (!TelegramAdminFormatService.isValidDate(input) || !pending.startDate) {
      return { text: 'Invalid end date. Use YYYY-MM-DD.', parseMode: MARKDOWN };
    }

    const startDate = pending.startDate;
    pendingSlowProductsRanges.delete(pendingKey);
    return this.buildSlowProductsMessageByDateRange(startDate, input, adminUserId, {
      maxDays: MAX_SLOW_PRODUCTS_RANGE_DAYS,
    });
  }

  static async sendSlowProductsByRange(
    chatId: number,
    range: string,
    adminUserId: number
  ) {
    const result = await this.buildSlowProductsMessageByRange(range, adminUserId);
    return this.sendResult(chatId, result);
  }

  static async sendSlowProductsByDateRange(
    chatId: number,
    startDate: string,
    endDate: string,
    adminUserId: number,
    options?: { maxDays?: number }
  ) {
    const result = await this.buildSlowProductsMessageByDateRange(
      startDate,
      endDate,
      adminUserId,
      options
    );
    return this.sendResult(chatId, result);
  }

  static async buildSlowProductsMessageByRange(
    range: string,
    adminUserId: number
  ): Promise<TelegramAdminCallbackResult> {
    const resolved = this.resolveReportRange(range);
    if (!resolved) {
      return {
        text: 'Invalid range. Use this_week, this_month, this_year, or YYYY-MM-DD.',
        parseMode: MARKDOWN,
      };
    }

    return this.buildSlowProductsMessageByDateRange(
      resolved.startDate,
      resolved.endDate,
      adminUserId
    );
  }

  static async buildSlowProductsMessageByDateRange(
    startDate: string,
    endDate: string,
    adminUserId: number,
    options?: { maxDays?: number }
  ): Promise<TelegramAdminCallbackResult> {
    if (
      !TelegramAdminFormatService.isValidDate(startDate) ||
      !TelegramAdminFormatService.isValidDate(endDate)
    ) {
      return { text: 'Invalid date format. Use YYYY-MM-DD.', parseMode: MARKDOWN };
    }

    const start = new Date(`${startDate}T00:00:00Z`);
    const end = new Date(`${endDate}T23:59:59Z`);
    if (isNaN(start.getTime()) || isNaN(end.getTime()) || start > end) {
      return {
        text: 'Invalid date range. Ensure start_date <= end_date.',
        parseMode: MARKDOWN,
      };
    }

    const diffDays =
      Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    if (options?.maxDays && diffDays > options.maxDays) {
      return {
        text: `Date range too long. Max ${options.maxDays} days.`,
        parseMode: MARKDOWN,
      };
    }

    const salesRows = await prisma.orderItem.groupBy({
      by: ['productId'],
      where: {
        order: {
          orderDate: {
            gte: start,
            lte: end,
          },
        },
      },
      _sum: { quantity: true, subtotal: true },
    });

    const salesMap = new Map<number, { quantity: number; revenue: number }>();
    salesRows.forEach((row: any) => {
      salesMap.set(row.productId, {
        quantity: Number(row._sum?.quantity || 0),
        revenue: Number(row._sum?.subtotal || 0),
      });
    });

    const products = await prisma.product.findMany({
      where: { status: 'active', deactivatedDate: null },
      select: {
        productId: true,
        productName: true,
        productCode: true,
        price: true,
        avgCost: true,
        lastPurchaseCost: true,
      },
    });

    if (!products.length) {
      return { text: 'No products found.', parseMode: MARKDOWN };
    }

    const stockRows = await prisma.stock.findMany({
      where: { productId: { in: products.map((p) => p.productId) } },
      select: { productId: true, quantity: true },
    });
    const stockMap = new Map(
      stockRows.map((row) => [row.productId, Number(row.quantity || 0)])
    );

    const merged = products.map((p) => {
      const sales = salesMap.get(p.productId) || { quantity: 0, revenue: 0 };
      const stockQty = stockMap.get(p.productId) ?? 0;
      const costPerUnit = Number(p.avgCost ?? p.lastPurchaseCost ?? 0);
      const stockValue = stockQty * costPerUnit;
      return {
        product_id: p.productId,
        product_name: p.productName,
        product_code: p.productCode,
        quantity_sold: sales.quantity,
        revenue: sales.revenue,
        average_price: Number(p.price),
        stockValue,
      };
    });

    const slowProducts = merged
      .sort((a, b) => a.quantity_sold - b.quantity_sold || a.revenue - b.revenue)
      .slice(0, 10);

    return this.buildSlowProductsMessage(startDate, endDate, slowProducts);
  }

  private static buildSlowProductsMessage(
    startDate: string,
    endDate: string,
    slowProducts: Array<{
      product_id: number;
      product_name: string;
      product_code: string;
      quantity_sold: number;
      revenue: number;
      average_price: number;
      stockValue: number;
    }>
  ) {
    const header = [
      '🐢 *របាយការណ៍ទំនិញលក់មិនដាច់*',
      `📅 *រយៈពេល*៖ ${startDate} → ${endDate}`,
      '',
    ];

    const lines = slowProducts.map((p, index) => {
      const name = TelegramAdminFormatService.escapeMarkdown(p.product_name);
      const code = TelegramAdminFormatService.escapeMarkdown(p.product_code);

      return [
        `*${index + 1}-${name}*`,
        ` •កូដ៖ \`${code}\``,
        ` •ចំនួនលក់៖ ${p.quantity_sold}`,
        ` •ចំណូល៖ $${p.revenue.toLocaleString()}`,
        ` •តម្លៃស្តុក៖ $${p.stockValue.toFixed(2)}`,
        '',
      ].join('\n');
    });

    return {
      text: [...header, ...(lines.length ? lines : ['*មិនមានទិន្នន័យ*'])].join('\n'),
      replyMarkup: { inline_keyboard: [NAV_ROW] },
      parseMode: MARKDOWN,
    };
  }

  static async handleIncomeRangeInput(
    pendingKey: string,
    chatId: number,
    text: string,
    adminUserId: number,
    telegramUserId: number
  ) {
    const result = await this.handleIncomeRangeInputResult(
      pendingKey,
      chatId,
      text,
      adminUserId,
      telegramUserId
    );
    if (!result) return;
    return this.sendResult(chatId, result);
  }

  static async handleIncomeRangeInputResult(
    pendingKey: string,
    chatId: number,
    text: string,
    adminUserId: number,
    telegramUserId: number
  ): Promise<TelegramAdminCallbackResult | undefined> {
    const input = text.trim();
    if (input.startsWith('/')) {
      const parts = input.split(/\s+/).filter(Boolean);
      const command = (parts[0] || '').split('@')[0].toLowerCase();
      const args = parts.slice(1);

      if (command === '/cancel') {
        pendingIncomeRanges.delete(pendingKey);
        return { text: 'Report request cancelled.', parseMode: MARKDOWN };
      }

      if (command === '/income' || command === '/profit') {
        pendingIncomeRanges.delete(pendingKey);
        if (args.length >= 1) {
          if (
            args.length === 2 &&
            TelegramAdminFormatService.isValidDate(args[0]) &&
            TelegramAdminFormatService.isValidDate(args[1])
          ) {
            return this.buildIncomeMessageByDateRange(args[0], args[1], adminUserId, {
              maxDays: MAX_INCOME_RANGE_DAYS,
            });
          }
          const range = args.join('_');
          return this.buildIncomeMessageByRange(range, adminUserId);
        }

        const dates = input.match(/\d{4}-\d{2}-\d{2}/g) || [];
        if (dates.length >= 2) {
          const [startDate, endDate] = dates;
          if (!startDate || !endDate) {
            return {
              text: 'Please provide a valid date range. Example: /income 2026-01-01 2026-01-30',
              parseMode: MARKDOWN,
            };
          }
          return this.buildIncomeMessageByDateRange(startDate, endDate, adminUserId, {
            maxDays: MAX_INCOME_RANGE_DAYS,
          });
        }
        if (dates.length === 1) {
          return this.buildIncomeMessageByRange(dates[0], adminUserId);
        }

        return {
          text: 'Please provide a date or range. Example: /income 2026-01-01 2026-01-30',
          parseMode: MARKDOWN,
        };
      }

      return { text: 'Income range pending. Send /cancel to stop.', parseMode: MARKDOWN };
    }

    const pending = pendingIncomeRanges.get(pendingKey);
    if (!pending) return;
    if (pending.telegramUserId !== telegramUserId) {
      return {
        text: 'Another user is completing a custom report. Please wait.',
        parseMode: MARKDOWN,
      };
    }

    if (pending.step === 'START') {
      if (!TelegramAdminFormatService.isValidDate(input)) {
        return { text: 'Invalid start date. Use YYYY-MM-DD.', parseMode: MARKDOWN };
      }
      pendingIncomeRanges.set(pendingKey, {
        step: 'END',
        startDate: input,
        telegramUserId: pending.telegramUserId,
      });
      return { text: 'Please enter end date (YYYY-MM-DD).', parseMode: MARKDOWN };
    }

    if (!TelegramAdminFormatService.isValidDate(input) || !pending.startDate) {
      return { text: 'Invalid end date. Use YYYY-MM-DD.', parseMode: MARKDOWN };
    }

    const startDate = pending.startDate;
    pendingIncomeRanges.delete(pendingKey);
    return this.buildIncomeMessageByDateRange(startDate, input, adminUserId, {
      maxDays: MAX_INCOME_RANGE_DAYS,
    });
  }

  static async sendIncomeByRange(
    chatId: number,
    range: string,
    adminUserId: number
  ) {
    const result = await this.buildIncomeMessageByRange(range, adminUserId);
    return this.sendResult(chatId, result);
  }

  static async sendIncomeByDateRange(
    chatId: number,
    startDate: string,
    endDate: string,
    adminUserId: number,
    options?: { maxDays?: number }
  ) {
    const result = await this.buildIncomeMessageByDateRange(
      startDate,
      endDate,
      adminUserId,
      options
    );
    return this.sendResult(chatId, result);
  }

  static async buildIncomeMessageByRange(
    range: string,
    adminUserId: number
  ): Promise<TelegramAdminCallbackResult> {
    const resolved = this.resolveReportRange(range);
    if (!resolved) {
      return {
        text: 'Invalid range. Use today, this_week, this_month, this_year, or YYYY-MM-DD.',
        parseMode: MARKDOWN,
      };
    }

    return this.buildIncomeMessageByDateRange(
      resolved.startDate,
      resolved.endDate,
      adminUserId
    );
  }

  static async buildIncomeMessageByDateRange(
    startDate: string,
    endDate: string,
    adminUserId: number,
    options?: { maxDays?: number }
  ): Promise<TelegramAdminCallbackResult> {
    if (
      !TelegramAdminFormatService.isValidDate(startDate) ||
      !TelegramAdminFormatService.isValidDate(endDate)
    ) {
      return { text: 'Invalid date format. Use YYYY-MM-DD.', parseMode: MARKDOWN };
    }

    const start = new Date(`${startDate}T00:00:00Z`);
    const end = new Date(`${endDate}T23:59:59Z`);
    if (isNaN(start.getTime()) || isNaN(end.getTime()) || start > end) {
      return {
        text: 'Invalid date range. Ensure start_date <= end_date.',
        parseMode: MARKDOWN,
      };
    }

    const diffDays =
      Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    if (options?.maxDays && diffDays > options.maxDays) {
      return {
        text: `Date range too long. Max ${options.maxDays} days.`,
        parseMode: MARKDOWN,
      };
    }

    const salesAgg = await prisma.order.aggregate({
      where: { orderDate: { gte: start, lte: end } },
      _sum: { totalAmount: true },
      _count: { orderId: true },
    });

    const cogsAgg = await prisma.orderItem.aggregate({
      where: { order: { orderDate: { gte: start, lte: end } } },
      _sum: { cogsLineTotal: true, quantity: true },
    });

    const missingCogsRows = await prisma.$queryRaw<
      { missing_count: number }[]
    >(Prisma.sql`
      SELECT COUNT(*)::int AS missing_count
      FROM order_items oi
      JOIN orders o ON o.order_id = oi.order_id
      WHERE o.order_date >= ${start}
        AND o.order_date <= ${end}
        AND oi.cogs_line_total IS NULL
    `);
    const missingCogsCount = Number(missingCogsRows[0]?.missing_count || 0);
    if (missingCogsCount > 0) {
      logger.warn('Missing COGS for some order items', { missingCogsCount });
    }

    const purchasesRows = await prisma.$queryRaw<
      { total_cost: any; total_qty: any }[]
    >(Prisma.sql`
      SELECT
        COALESCE(SUM(COALESCE(cost, 0) * COALESCE(quantity, 0)), 0) AS total_cost,
        COALESCE(SUM(COALESCE(quantity, 0)), 0) AS total_qty
      FROM stock_movements
      WHERE movement_type = 'STOCK_IN'
        AND created_at >= ${start}
        AND created_at <= ${end}
    `);

    const totalSales = Number(salesAgg._sum.totalAmount || 0);
    const totalOrders = Number(salesAgg._count.orderId || 0);
    const totalItems = Number(cogsAgg._sum?.quantity || 0);
    const cogs = Number(cogsAgg._sum?.cogsLineTotal || 0);
    const purchasesCost = Number(purchasesRows[0]?.total_cost || 0);
    const purchasesQty = Number(purchasesRows[0]?.total_qty || 0);
    const profit = calculateProfit(totalSales, cogs);

    const message = [
      '💰 *របាយការណ៍ចំណូល*',
      `📅 Range: ${startDate} → ${endDate} (${diffDays} days)`,
      '',
      `• ចំណូលពីការលក់: $${totalSales.toLocaleString()}`,
      `• ចំនួនការលក់: ${totalOrders}`,
      `• ចំនួនទំនិញលក់: ${totalItems}`,
      `• COGS (តម្លៃដើម): $${cogs.toLocaleString()}`,
      `• ចំណេញ/ខាត: $${profit.toLocaleString()}`,
      '',
      `• ចំណាយនាំចូលសរុប: $${purchasesCost.toLocaleString()}`,
      `• បរិមាណនាំចូលសរុប: ${purchasesQty}`,
      '*សម្គាល់:* COGS គណនាតាម order items cost per unit at sale (locked at sale time).',
    ].join('\n');

    return { text: message, parseMode: MARKDOWN };
  }

  static startCustomReportRange(chatId: number, telegramUserId: number) {
    const pendingKey = getPendingKey(chatId);
    clearAllRangePending(pendingKey);
    pendingReportRanges.set(pendingKey, { step: 'START', telegramUserId });
  }

  static startCustomTopRange(chatId: number, telegramUserId: number) {
    const pendingKey = getPendingKey(chatId);
    clearAllRangePending(pendingKey);
    pendingTopProductsRanges.set(pendingKey, { step: 'START', telegramUserId });
  }

  static startCustomSlowRange(chatId: number, telegramUserId: number) {
    const pendingKey = getPendingKey(chatId);
    clearAllRangePending(pendingKey);
    pendingSlowProductsRanges.set(pendingKey, { step: 'START', telegramUserId });
  }

  static startCustomIncomeRange(chatId: number, telegramUserId: number) {
    const pendingKey = getPendingKey(chatId);
    clearAllRangePending(pendingKey);
    pendingIncomeRanges.set(pendingKey, { step: 'START', telegramUserId });
  }

  private static async sendResult(
    chatId: number,
    result: TelegramAdminCallbackResult
  ) {
    if (result.replyMarkup) {
      return TelegramService.sendMenuMessage(
        chatId,
        result.text,
        result.replyMarkup,
        result.parseMode ?? 'Markdown'
      );
    }
    return TelegramService.sendMessageByChatId(
      chatId,
      result.text,
      result.parseMode ?? 'Markdown'
    );
  }
}