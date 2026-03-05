import {
  getPendingKey,
  getUserPendingKey,
  pendingIncomeRanges,
  pendingReportRanges,
  pendingSlowProductsRanges,
  pendingTopProductsRanges,
  pendingStockHistoryQueries,
  clearStockHistoryPending,
  getStockInPending,
  getStockAdjustPending,
} from './telegram-admin-state.service';
import { TelegramAdminReportService } from './telegram-admin-report.service';
import { TelegramAdminStockService } from './telegram-admin-stock.service';
import { logger } from '@src/shared/utils/logger';
import type { TelegramAdminCallbackResult } from '@src/domains/TelegramAdminBot/types/telegram-admin-callback.types';

export class TelegramAdminInputRouterService {
  static async handlePendingInput(
    chatId: number,
    text: string | undefined,
    adminUserId: number,
    telegramUserId: number,
    tenantId: number
  ): Promise<TelegramAdminCallbackResult | null> {
    if (!text) return null;
    const pendingKey = getPendingKey(chatId);
    const userPendingKey = getUserPendingKey(chatId, telegramUserId);

    logger.info('Telegram admin input router start', {
      chatId,
      fromId: telegramUserId,
      tenantId,
      text,
    });

    if (pendingReportRanges.has(pendingKey)) {
      const result = await TelegramAdminReportService.handleReportRangeInputResult(
        pendingKey,
        chatId,
        text,
        adminUserId,
        telegramUserId,
        tenantId
      );
      return result ?? null;
    }
    if (pendingTopProductsRanges.has(pendingKey)) {
      const result = await TelegramAdminReportService.handleTopProductsRangeInputResult(
        pendingKey,
        chatId,
        text,
        adminUserId,
        telegramUserId,
        tenantId
      );
      return result ?? null;
    }
    if (pendingSlowProductsRanges.has(pendingKey)) {
      const result = await TelegramAdminReportService.handleSlowProductsRangeInputResult(
        pendingKey,
        chatId,
        text,
        adminUserId,
        telegramUserId,
        tenantId
      );
      return result ?? null;
    }
    if (pendingIncomeRanges.has(pendingKey)) {
      const result = await TelegramAdminReportService.handleIncomeRangeInputResult(
        pendingKey,
        chatId,
        text,
        adminUserId,
        telegramUserId,
        tenantId
      );
      return result ?? null;
    }

    const pendingStockIn = getStockInPending(chatId, telegramUserId);
    if (pendingStockIn) {
      if (pendingStockIn.telegramUserId !== telegramUserId) {
        return {
          text: 'Another user is completing a stock in request. Please wait.',
          parseMode: 'Markdown',
        };
      }

      return TelegramAdminStockService.handleStockInBlockInput(
        chatId,
        text,
        adminUserId,
        telegramUserId,
        tenantId
      );
    }

    const pendingStockAdjust = getStockAdjustPending(chatId, telegramUserId);
    if (pendingStockAdjust) {
      if (pendingStockAdjust.telegramUserId !== telegramUserId) {
        return {
          text: 'Another user is completing a stock adjustment request. Please wait.',
          parseMode: 'Markdown',
        };
      }

      return TelegramAdminStockService.handleStockAdjustBlockInput(
        chatId,
        text,
        adminUserId,
        telegramUserId,
        tenantId
      );
    }

    if (pendingStockHistoryQueries.has(userPendingKey)) {
      try {
        const normalized = text.trim();
        let query = normalized;
        const command = normalized.split(/\s+/)[0]?.split('@')[0]?.toLowerCase();
        if (command === '/product' || command === '/p') {
          query = normalized.split(/\s+/).slice(1).join(' ').trim();
        }

        if (!query) {
          return {
            text: 'សូមបញ្ចូល Product Code ឬ Product Name',
            parseMode: 'Markdown',
          };
        }

        const products = await TelegramAdminStockService.findProductsByQuery(query, tenantId);
        if (!products.length) {
          logger.info('Telegram admin stock history not found', {
            chatId,
            tenantId,
            query,
          });
          return {
            text: 'រកមិនឃើញទំនិញ',
            parseMode: 'Markdown',
          };
        }
        if (products.length === 1) {
          clearStockHistoryPending(chatId, telegramUserId);
          return TelegramAdminStockService.buildStockHistoryPreview(products[0].productId, tenantId, 20);
        }
        return {
          text: 'សូមជ្រើសរើសទំនិញ៖',
          parseMode: 'Markdown',
          replyMarkup: TelegramAdminStockService.buildStockHistorySelectKeyboard(products),
        };
      } catch (error: any) {
        logger.error('Telegram admin stock history input failed', {
          chatId,
          tenantId,
          error: error.message,
        });
        return {
          text: '❌ Something went wrong. Please try again.',
          parseMode: 'Markdown',
        };
      }
    }

    logger.info('Telegram admin input router no pending handler', {
      chatId,
      fromId: telegramUserId,
    });
    return null;
  }
}
