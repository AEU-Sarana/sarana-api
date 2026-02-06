import { redisConnection } from '@src/domains/TelegramAdminBot/jobs/telegram-admin.queue';
import { TelegramAdminReportService } from './telegram-admin-report.service';
import { TelegramAdminFormatService } from './telegram-admin-format.service';
import type { TelegramAdminCallbackResult } from '@src/domains/TelegramAdminBot/types/telegram-admin-callback.types';

type CallbackContext = {
  chatId: number;
  telegramUserId: number;
  adminUserId: number;
};

const CACHE_TTL_SECONDS = 60;

export class TelegramAdminCallbackReportService {
  static async handle(
    callbackData: string,
    ctx: CallbackContext
  ): Promise<TelegramAdminCallbackResult | null> {
    if (callbackData.startsWith('EXPORT_EXCEL_')) {
      return null;
    }
    const parsed = this.parseCallback(callbackData);
    if (!parsed) return null;

    const { type, range } = parsed;
    const normalizedRange = range.toLowerCase();

    if (normalizedRange === 'custom' || normalizedRange === 'menu') {
      switch (type) {
        case 'report':
          TelegramAdminReportService.startCustomReportRange(ctx.chatId, ctx.telegramUserId);
          return {
            text: TelegramAdminFormatService.buildCustomRangePrompt('report'),
            parseMode: 'Markdown',
          };
        case 'top_products':
          TelegramAdminReportService.startCustomTopRange(ctx.chatId, ctx.telegramUserId);
          return {
            text: TelegramAdminFormatService.buildCustomRangePrompt('top'),
            parseMode: 'Markdown',
          };
        case 'slow_products':
          TelegramAdminReportService.startCustomSlowRange(ctx.chatId, ctx.telegramUserId);
          return {
            text: TelegramAdminFormatService.buildCustomRangePrompt('slow'),
            parseMode: 'Markdown',
          };
        case 'income':
          TelegramAdminReportService.startCustomIncomeRange(ctx.chatId, ctx.telegramUserId);
          return {
            text: TelegramAdminFormatService.buildCustomRangePrompt('income'),
            parseMode: 'Markdown',
          };
      }
    }

    const resolved = TelegramAdminReportService.resolveReportRange(normalizedRange);
    const cacheKey = resolved
      ? `report:${type}:${normalizedRange}:${resolved.startDate}-${resolved.endDate}`
      : `report:${type}:${normalizedRange}`;

    const cached = await redisConnection.get(cacheKey);
    if (cached) {
      return JSON.parse(cached) as TelegramAdminCallbackResult;
    }

    let result: TelegramAdminCallbackResult;
    if (type === 'report') {
      result = await TelegramAdminReportService.buildReportMessageByRange(
        normalizedRange,
        ctx.adminUserId
      );
    } else if (type === 'top_products') {
      result = await TelegramAdminReportService.buildTopProductsMessageByRange(
        normalizedRange,
        ctx.adminUserId
      );
    } else if (type === 'slow_products') {
      result = await TelegramAdminReportService.buildSlowProductsMessageByRange(
        normalizedRange,
        ctx.adminUserId
      );
    } else {
      result = await TelegramAdminReportService.buildIncomeMessageByRange(
        normalizedRange,
        ctx.adminUserId
      );
    }

    await redisConnection.set(
      cacheKey,
      JSON.stringify(result),
      'EX',
      CACHE_TTL_SECONDS
    );

    return result;
  }

  private static parseCallback(callbackData: string) {
    if (callbackData.startsWith('REPORT:')) {
      return { type: 'report' as const, range: callbackData.replace('REPORT:', '') };
    }
    if (callbackData.startsWith('TOP_PRODUCTS:')) {
      return { type: 'top_products' as const, range: callbackData.replace('TOP_PRODUCTS:', '') };
    }
    if (callbackData.startsWith('SLOW_PRODUCTS:')) {
      return { type: 'slow_products' as const, range: callbackData.replace('SLOW_PRODUCTS:', '') };
    }
    if (callbackData.startsWith('INCOME:')) {
      return { type: 'income' as const, range: callbackData.replace('INCOME:', '') };
    }
    if (callbackData.startsWith('action:report:')) {
      return { type: 'report' as const, range: callbackData.replace('action:report:', '') };
    }
    if (callbackData.startsWith('action:top_products:')) {
      return { type: 'top_products' as const, range: callbackData.replace('action:top_products:', '') };
    }
    if (callbackData.startsWith('action:slow_products:')) {
      return { type: 'slow_products' as const, range: callbackData.replace('action:slow_products:', '') };
    }
    if (callbackData.startsWith('action:income:')) {
      return { type: 'income' as const, range: callbackData.replace('action:income:', '') };
    }
    return null;
  }
}
