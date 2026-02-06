import {
  getPendingKey,
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
    telegramUserId: number
  ): Promise<TelegramAdminCallbackResult | null> {
    if (!text) return null;
    const pendingKey = getPendingKey(chatId);

    logger.info('Telegram admin input router start', {
      chatId,
      fromId: telegramUserId,
      text,
    });

    if (pendingReportRanges.has(pendingKey)) {
      const result = await TelegramAdminReportService.handleReportRangeInputResult(
        pendingKey,
        chatId,
        text,
        adminUserId,
        telegramUserId
      );
      return result ?? null;
    }
    if (pendingTopProductsRanges.has(pendingKey)) {
      const result = await TelegramAdminReportService.handleTopProductsRangeInputResult(
        pendingKey,
        chatId,
        text,
        adminUserId,
        telegramUserId
      );
      return result ?? null;
    }
    if (pendingSlowProductsRanges.has(pendingKey)) {
      const result = await TelegramAdminReportService.handleSlowProductsRangeInputResult(
        pendingKey,
        chatId,
        text,
        adminUserId,
        telegramUserId
      );
      return result ?? null;
    }
    if (pendingIncomeRanges.has(pendingKey)) {
      const result = await TelegramAdminReportService.handleIncomeRangeInputResult(
        pendingKey,
        chatId,
        text,
        adminUserId,
        telegramUserId
      );
      return result ?? null;
    }

    const pendingStockIn = getStockInPending(chatId);
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
        telegramUserId
      );
    }

    const pendingStockAdjust = getStockAdjustPending(chatId);
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
        telegramUserId
      );
    }

    if (pendingStockHistoryQueries.has(pendingKey)) {
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

        const products = await TelegramAdminStockService.findProductsByQuery(query);
        if (!products.length) {
          logger.info('Telegram admin stock history not found', {
            chatId,
            query,
          });
          return {
            text: 'រកមិនឃើញទំនិញ',
            parseMode: 'Markdown',
          };
        }
        if (products.length === 1) {
          clearStockHistoryPending(chatId);
          return TelegramAdminStockService.buildStockHistoryPreview(products[0].productId, 20);
        }
        return {
          text: 'សូមជ្រើសរើសទំនិញ៖',
          parseMode: 'Markdown',
          replyMarkup: TelegramAdminStockService.buildStockHistorySelectKeyboard(products),
        };
      } catch (error: any) {
        logger.error('Telegram admin stock history input failed', {
          chatId,
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
