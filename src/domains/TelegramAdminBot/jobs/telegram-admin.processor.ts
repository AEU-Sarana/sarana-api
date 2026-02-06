import type { Job } from 'bullmq';
import { logger } from '@src/shared/utils/logger';
import { TelegramService } from '@src/domains/Telegram/services/telegram.service';
import { TelegramAdminParserService } from '@src/domains/TelegramAdminBot/services/telegram-admin-parser.service';
import { TelegramAdminLinksService } from '@src/domains/TelegramAdminBot/services/telegram-admin-links.service';
import { TelegramAdminLinkService } from '@src/domains/TelegramAdminBot/services/telegram-admin-link.service';
import { TelegramAdminStockService } from '@src/domains/TelegramAdminBot/services/telegram-admin-stock.service';
import { TelegramAdminReportService } from '@src/domains/TelegramAdminBot/services/telegram-admin-report.service';
import { TelegramAdminInventoryService } from '@src/domains/TelegramAdminBot/services/telegram-admin-inventory.service';
import { TelegramAdminConfirmService } from '@src/domains/TelegramAdminBot/services/telegram-admin-confirm.service';
import { TelegramAdminCallbackReportService } from '@src/domains/TelegramAdminBot/services/telegram-admin-callback-report.service';
import { TelegramAdminCallbackInventoryService } from '@src/domains/TelegramAdminBot/services/telegram-admin-callback-inventory.service';
import { TelegramAdminCallbackNavService } from '@src/domains/TelegramAdminBot/services/telegram-admin-callback-nav.service';
import { TelegramAdminExcelExportService } from '@src/domains/TelegramAdminBot/services/telegram-admin-excel-export.service';
import { telegramAdminExportQueue } from '@src/domains/TelegramAdminBot/jobs/telegram-admin-export-excel.queue';
import type { TelegramAdminExportJobPayload } from '@src/domains/TelegramAdminBot/types/telegram-admin-export.types';
import { redisConnection } from '@src/domains/TelegramAdminBot/jobs/telegram-admin.queue';
import type {
  TelegramAdminCallbackJobPayload,
  TelegramAdminMessageJobPayload,
} from '@src/domains/TelegramAdminBot/types/telegram-admin-jobs.types';
import { getMenuStateKey, resetStack } from '@src/domains/Telegram/menu/menu-state';
import { renderMenu } from '@src/domains/Telegram/menu/menu-renderer';
import {
  getPendingKey,
  pendingIncomeRanges,
  pendingReportRanges,
  pendingSlowProductsRanges,
  pendingTopProductsRanges,
  getStockHistoryPending,
  clearStockHistoryPending,
  getStockInDraft,
  getStockInPending,
  clearStockInPending,
  getStockAdjustDraft,
} from '@src/domains/TelegramAdminBot/services/telegram-admin-state.service';
import type { TelegramAdminStockHistoryExportJobPayload } from '@src/domains/TelegramAdminBot/types/telegram-admin-stock-history.types';
import { telegramAdminStockHistoryExportQueue } from '@src/domains/TelegramAdminBot/jobs/telegram-admin-stock-history-export.queue';

export async function processTelegramAdminJob(
  job: Job<TelegramAdminCallbackJobPayload | TelegramAdminMessageJobPayload>
) {
  switch (job.name) {
    case 'HANDLE_CALLBACK':
      return handleCallbackJob(job.data as TelegramAdminCallbackJobPayload);
    case 'HANDLE_MESSAGE':
      return handleMessageJob(job.data as TelegramAdminMessageJobPayload);
    default:
      logger.warn('Unknown Telegram admin job', { name: job.name });
      return null;
  }
}

async function handleCallbackJob(payload: TelegramAdminCallbackJobPayload) {
  const { chatId, callbackData, processingMessageId, telegramUserId } = payload;

  try {
    if (callbackData === 'noop') {
      return TelegramService.editMessageByChatId(
        chatId,
        processingMessageId,
        '⏳ Processing...',
        'Markdown'
      );
    }

    const link = await TelegramAdminLinksService.requireActiveLink(telegramUserId, chatId);
    const adminUserId = link.userId;

    const exportHandled = await handleExportCallback({
      chatId,
      telegramUserId,
      adminUserId,
      callbackData,
      processingMessageId,
      originMessageId: payload.messageId,
    });
    if (exportHandled) return exportHandled;

    if (callbackData === 'STOCK_IN') {
      const prompt = TelegramAdminStockService.startStockInPrompt(chatId, telegramUserId);
      if (prompt.replyMarkup) {
        await TelegramService.sendMenuMessage(
          chatId,
          prompt.text,
          prompt.replyMarkup,
          prompt.parseMode ?? 'Markdown'
        );
      } else {
        await TelegramService.sendMessageByChatId(
          chatId,
          prompt.text,
          prompt.parseMode ?? 'Markdown'
        );
      }

      return TelegramService.editMessageByChatId(
        chatId,
        processingMessageId,
        '✅',
        'Markdown'
      );
    }

    if (callbackData === 'NAV_STOCK_ADJUST') {
      const prompt = TelegramAdminStockService.startStockAdjustPrompt(chatId, telegramUserId);
      if (prompt.replyMarkup) {
        await TelegramService.sendMenuMessage(
          chatId,
          prompt.text,
          prompt.replyMarkup,
          prompt.parseMode ?? 'Markdown'
        );
      } else {
        await TelegramService.sendMessageByChatId(
          chatId,
          prompt.text,
          prompt.parseMode ?? 'Markdown'
        );
      }

      return TelegramService.editMessageByChatId(
        chatId,
        processingMessageId,
        '✅',
        'Markdown'
      );
    }

    if (callbackData === 'NAV_STOCK_HISTORY') {
      const prompt = TelegramAdminStockService.startStockHistoryPrompt(chatId, telegramUserId);
      if (prompt.replyMarkup) {
        await TelegramService.sendMenuMessage(
          chatId,
          prompt.text,
          prompt.replyMarkup,
          prompt.parseMode ?? 'Markdown'
        );
      } else {
        await TelegramService.sendMessageByChatId(
          chatId,
          prompt.text,
          prompt.parseMode ?? 'Markdown'
        );
      }

      return TelegramService.editMessageByChatId(
        chatId,
        processingMessageId,
        '✅',
        'Markdown'
      );
    }

    const stockHistoryHandled = await handleStockHistoryCallback({
      chatId,
      callbackData,
      processingMessageId,
      adminUserId,
    });
    if (stockHistoryHandled) return stockHistoryHandled;

    const navResult = await TelegramAdminCallbackNavService.handle(callbackData, {
      chatId,
      telegramUserId,
    });
    if (navResult) {
      return TelegramService.editMessageByChatId(
        chatId,
        processingMessageId,
        navResult.text,
        navResult.parseMode ?? 'Markdown',
        navResult.replyMarkup
      );
    }

    const reportResult = await TelegramAdminCallbackReportService.handle(callbackData, {
      chatId,
      telegramUserId,
      adminUserId,
    });
    if (reportResult) {
      return TelegramService.editMessageByChatId(
        chatId,
        processingMessageId,
        reportResult.text,
        reportResult.parseMode ?? 'Markdown',
        reportResult.replyMarkup
      );
    }

    const inventoryResult = await TelegramAdminCallbackInventoryService.handle(callbackData, {
      chatId,
      telegramUserId,
      adminUserId,
    });
    if (inventoryResult) {
      return TelegramService.editMessageByChatId(
        chatId,
        processingMessageId,
        inventoryResult.text,
        inventoryResult.parseMode ?? 'Markdown',
        inventoryResult.replyMarkup
      );
    }

    if (callbackData === 'action:resend_last_report') {
      const prompt = TelegramAdminConfirmService.buildConfirmPrompt('RESEND_LAST_REPORT');
      return TelegramService.editMessageByChatId(
        chatId,
        processingMessageId,
        prompt.text,
        prompt.parseMode ?? 'Markdown',
        prompt.replyMarkup
      );
    }

    if (callbackData.startsWith('ACTION:')) {
      const action = callbackData.replace('ACTION:', '');
      const confirmResult = TelegramAdminConfirmService.buildConfirmPrompt(action);
      return TelegramService.editMessageByChatId(
        chatId,
        processingMessageId,
        confirmResult.text,
        confirmResult.parseMode ?? 'Markdown',
        confirmResult.replyMarkup
      );
    }

    if (callbackData.startsWith('STOCK_IN_CONFIRM:')) {
      const draftId = callbackData.replace('STOCK_IN_CONFIRM:', '').trim();
      if (!draftId) {
        return TelegramService.editMessageByChatId(
          chatId,
          processingMessageId,
          'Invalid draft.',
          'Markdown'
        );
      }

      const draft = getStockInDraft(draftId);
      const lockKey = draft
        ? `lock:stock_in:${chatId}:${draft.product.productId}:${draft.qty}:${draft.expiredAt ?? 'none'}`
        : `lock:stock_in:${chatId}:${draftId}`;
      const acquired = await redisConnection.set(
        lockKey,
        '1',
        'EX',
        15,
        'NX'
      );
      if (!acquired) {
        return TelegramService.editMessageByChatId(
          chatId,
          processingMessageId,
          '⏳ Already processing...',
          'Markdown'
        );
      }

      const result = await TelegramAdminStockService.confirmStockIn(draftId, adminUserId);
      return TelegramService.editMessageByChatId(
        chatId,
        processingMessageId,
        result.text,
        result.parseMode ?? 'Markdown',
        result.replyMarkup
      );
    }

    if (callbackData.startsWith('STOCK_IN_CANCEL:')) {
      const draftId = callbackData.replace('STOCK_IN_CANCEL:', '').trim();
      if (!draftId) {
        return TelegramService.editMessageByChatId(
          chatId,
          processingMessageId,
          'Invalid draft.',
          'Markdown'
        );
      }

      TelegramAdminStockService.cancelStockIn(draftId);
      await TelegramService.editMessageByChatId(
        chatId,
        processingMessageId,
        'Cancelled.',
        'Markdown'
      );

      const menuKey = getMenuStateKey(chatId, telegramUserId);
      resetStack(menuKey);
      return renderMenu({ chatId, telegramUserId }, 'main', { preferEdit: false });
    }

    if (callbackData.startsWith('STOCK_ADJUST_CONFIRM:')) {
      const draftId = callbackData.replace('STOCK_ADJUST_CONFIRM:', '').trim();
      if (!draftId) {
        return TelegramService.editMessageByChatId(
          chatId,
          processingMessageId,
          'Invalid draft.',
          'Markdown'
        );
      }

      const draft = getStockAdjustDraft(draftId);
      const lockKey = draft
        ? `lock:stock_adjust:${chatId}:${draft.productId}:${draft.qty}`
        : `lock:stock_adjust:${chatId}:${draftId}`;
      const acquired = await redisConnection.set(lockKey, '1', 'EX', 15, 'NX');
      if (!acquired) {
        return TelegramService.editMessageByChatId(
          chatId,
          processingMessageId,
          '⏳ Already processing...',
          'Markdown'
        );
      }

      const result = await TelegramAdminStockService.confirmStockAdjust(draftId, adminUserId);
      return TelegramService.editMessageByChatId(
        chatId,
        processingMessageId,
        result.text,
        result.parseMode ?? 'Markdown',
        result.replyMarkup
      );
    }

    if (callbackData.startsWith('STOCK_ADJUST_CANCEL:')) {
      const draftId = callbackData.replace('STOCK_ADJUST_CANCEL:', '').trim();
      if (!draftId) {
        return TelegramService.editMessageByChatId(
          chatId,
          processingMessageId,
          'Invalid draft.',
          'Markdown'
        );
      }

      TelegramAdminStockService.cancelStockAdjust(draftId);
      await TelegramService.editMessageByChatId(
        chatId,
        processingMessageId,
        '❌ Canceled',
        'Markdown'
      );

      const menuKey = getMenuStateKey(chatId, telegramUserId);
      resetStack(menuKey);
      return renderMenu({ chatId, telegramUserId }, 'update_stock', { preferEdit: false });
    }

    if (callbackData.startsWith('CONFIRM:')) {
      const action = callbackData.replace('CONFIRM:', '');
      const result = await TelegramAdminConfirmService.executeConfirmedAction(
        chatId,
        action,
        adminUserId
      );
      return result ?? null;
    }

    return TelegramService.editMessageByChatId(
      chatId,
      processingMessageId,
      'Unknown action.',
      'Markdown'
    );
  } catch (error: any) {
    logger.error('Telegram admin callback job failed', { error: error.message });
    return TelegramService.editMessageByChatId(
      chatId,
      processingMessageId,
      '❌ Something went wrong. Please try again.',
      'Markdown'
    );
  }
}

async function handleMessageJob(payload: TelegramAdminMessageJobPayload) {
  const { chatId, text, telegramUserId, processingMessageId } = payload;

  try {
    if (!text) return null;

    if (text.startsWith('/link')) {
      return TelegramAdminLinkService.handleLinkCommand(telegramUserId, chatId, text);
    }

    const command = TelegramAdminParserService.toCommand(text);

    if (command.type === 'START') {
      const menuKey = getMenuStateKey(chatId, telegramUserId);
      resetStack(menuKey);
      return renderMenu({ chatId, telegramUserId }, 'main', { preferEdit: false });
    }

    const link = await TelegramAdminLinksService.requireActiveLink(telegramUserId, chatId);
    const adminUserId = link.userId;

    const pendingKey = getPendingKey(chatId);
    if (pendingReportRanges.has(pendingKey) && processingMessageId) {
      const result = await TelegramAdminReportService.handleReportRangeInputResult(
        pendingKey,
        chatId,
        text,
        adminUserId,
        telegramUserId
      );
      if (result) {
        return TelegramService.editMessageByChatId(
          chatId,
          processingMessageId,
          result.text,
          result.parseMode ?? 'Markdown',
          result.replyMarkup
        );
      }
    }

    if (pendingTopProductsRanges.has(pendingKey) && processingMessageId) {
      const result = await TelegramAdminReportService.handleTopProductsRangeInputResult(
        pendingKey,
        chatId,
        text,
        adminUserId,
        telegramUserId
      );
      if (result) {
        return TelegramService.editMessageByChatId(
          chatId,
          processingMessageId,
          result.text,
          result.parseMode ?? 'Markdown',
          result.replyMarkup
        );
      }
    }

    if (pendingSlowProductsRanges.has(pendingKey) && processingMessageId) {
      const result = await TelegramAdminReportService.handleSlowProductsRangeInputResult(
        pendingKey,
        chatId,
        text,
        adminUserId,
        telegramUserId
      );
      if (result) {
        return TelegramService.editMessageByChatId(
          chatId,
          processingMessageId,
          result.text,
          result.parseMode ?? 'Markdown',
          result.replyMarkup
        );
      }
    }

    if (pendingIncomeRanges.has(pendingKey) && processingMessageId) {
      const result = await TelegramAdminReportService.handleIncomeRangeInputResult(
        pendingKey,
        chatId,
        text,
        adminUserId,
        telegramUserId
      );
      if (result) {
        return TelegramService.editMessageByChatId(
          chatId,
          processingMessageId,
          result.text,
          result.parseMode ?? 'Markdown',
          result.replyMarkup
        );
      }
    }

    const pendingStockHistory = getStockHistoryPending(chatId);
    if (pendingStockHistory && processingMessageId) {
      if (pendingStockHistory.telegramUserId !== telegramUserId) {
        return TelegramService.editMessageByChatId(
          chatId,
          processingMessageId,
          'Another user is completing a stock history query. Please wait.',
          'Markdown'
        );
      }

      const trimmed = text.trim();
      if (trimmed.toLowerCase() === '/cancel') {
        clearStockHistoryPending(chatId);
        await TelegramService.editMessageByChatId(
          chatId,
          processingMessageId,
          'Cancelled.',
          'Markdown'
        );
        const menuKey = getMenuStateKey(chatId, telegramUserId);
        resetStack(menuKey);
        return renderMenu({ chatId, telegramUserId }, 'main', { preferEdit: false });
      }

      const tSearchStart = Date.now();
      const products = await TelegramAdminStockService.findProductsByQuery(trimmed);
      const tSearchMs = Date.now() - tSearchStart;
      logger.info('Telegram admin stock history search', {
        chatId,
        query: trimmed,
        results: products.length,
        t_search_ms: tSearchMs,
      });

      if (!products.length) {
        return TelegramService.editMessageByChatId(
          chatId,
          processingMessageId,
          'រកមិនឃើញទំនិញ\nសូមបញ្ចូល Product Code ឬ Product Name ម្តងទៀត។',
          'Markdown'
        );
      }

      if (products.length === 1) {
        clearStockHistoryPending(chatId);
        const tPreviewStart = Date.now();
        const preview = await TelegramAdminStockService.buildStockHistoryPreview(
          products[0].productId,
          20
        );
        const tPreviewMs = Date.now() - tPreviewStart;
        logger.info('Telegram admin stock history preview', {
          chatId,
          productId: products[0].productId,
          t_preview_ms: tPreviewMs,
        });
        return TelegramService.editMessageByChatId(
          chatId,
          processingMessageId,
          preview.text,
          preview.parseMode ?? 'Markdown',
          preview.replyMarkup
        );
      }

      return TelegramService.editMessageByChatId(
        chatId,
        processingMessageId,
        'សូមជ្រើសរើសទំនិញ៖',
        'Markdown',
        TelegramAdminStockService.buildStockHistorySelectKeyboard(products)
      );
    }

    const pendingStockIn = getStockInPending(chatId);
    if (pendingStockIn && processingMessageId) {
      if (pendingStockIn.telegramUserId !== telegramUserId) {
        return TelegramService.editMessageByChatId(
          chatId,
          processingMessageId,
          'Another user is completing a stock in request. Please wait.',
          'Markdown'
        );
      }

      const trimmed = text.trim();
      if (trimmed.toLowerCase() === '/cancel') {
        clearStockInPending(chatId);
        await TelegramService.editMessageByChatId(
          chatId,
          processingMessageId,
          'Cancelled.',
          'Markdown'
        );
        const menuKey = getMenuStateKey(chatId, telegramUserId);
        resetStack(menuKey);
        return renderMenu({ chatId, telegramUserId }, 'main', { preferEdit: false });
      }

      const result = await TelegramAdminStockService.handleStockInBlockInput(
        chatId,
        trimmed,
        adminUserId,
        telegramUserId
      );
      return TelegramService.editMessageByChatId(
        chatId,
        processingMessageId,
        result.text,
        result.parseMode ?? 'Markdown',
        result.replyMarkup
      );
    }

    if (command.type === 'PRODUCT_LOOKUP') {
      return TelegramAdminStockService.handleProductLookup(command.productCode, adminUserId);
    }

    if (command.type === 'STOCK_WRITE') {
      return TelegramAdminStockService.handleStockWrite(command, text, telegramUserId, adminUserId);
    }

    if (!processingMessageId) {
      return null;
    }

    if (command.type === 'REPORT') {
      const args = (text || '').trim().split(/\s+/).slice(1);
      const result = await TelegramAdminReportService.handleReportCommandResult(
        chatId,
        args,
        adminUserId,
        telegramUserId
      );
      return TelegramService.editMessageByChatId(
        chatId,
        processingMessageId,
        result.text,
        result.parseMode ?? 'Markdown',
        result.replyMarkup
      );
    }

    if (command.type === 'LOWSTOCK') {
      const result = await TelegramAdminInventoryService.buildLowStockMessage(adminUserId);
      return TelegramService.editMessageByChatId(
        chatId,
        processingMessageId,
        result.text,
        result.parseMode ?? 'Markdown',
        result.replyMarkup
      );
    }

    if (command.type === 'SHIFT_SUMMARY') {
      const result = await TelegramAdminInventoryService.buildShiftSummaryMessage(adminUserId);
      return TelegramService.editMessageByChatId(
        chatId,
        processingMessageId,
        result.text,
        result.parseMode ?? 'Markdown',
        result.replyMarkup
      );
    }

    if (command.type === 'RESEND_LAST_REPORT') {
      const prompt = TelegramAdminConfirmService.buildConfirmPrompt('RESEND_LAST_REPORT');
      return TelegramService.editMessageByChatId(
        chatId,
        processingMessageId,
        prompt.text,
        prompt.parseMode ?? 'Markdown',
        prompt.replyMarkup
      );
    }

    if (command.type === 'UNLINK_BOT') {
      const prompt = TelegramAdminConfirmService.buildConfirmPrompt('UNLINK_BOT');
      return TelegramService.editMessageByChatId(
        chatId,
        processingMessageId,
        prompt.text,
        prompt.parseMode ?? 'Markdown',
        prompt.replyMarkup
      );
    }

    return TelegramService.editMessageByChatId(
      chatId,
      processingMessageId,
      'Unknown command.',
      'Markdown'
    );
  } catch (error: any) {
    logger.error('Telegram admin message job failed', { error: error.message });
    const errorMessage = error?.message
      ? `❌ ${error.message}`
      : '❌ Something went wrong. Please try again.';
    if (processingMessageId) {
      return TelegramService.editMessageByChatId(
        chatId,
        processingMessageId,
        errorMessage,
        'Markdown'
      );
    }
    return TelegramService.sendMessageByChatId(chatId, errorMessage, 'Markdown');
  }
}

const EXPORT_LOCK_TTL_SECONDS = 20;
const STOCK_HISTORY_EXPORT_LOCK_TTL_SECONDS = 20;

function isExportCallback(data: string) {
  return data === 'EXPORT_EXCEL_STOCK_ALL' || data.startsWith('EXPORT_EXCEL_SALES_RANK:');
}

async function handleExportCallback(params: {
  chatId: number;
  telegramUserId: number;
  adminUserId: number;
  callbackData: string;
  processingMessageId: number;
  originMessageId?: number;
}) {
  const { chatId, adminUserId, callbackData, processingMessageId, originMessageId } = params;

  if (!isExportCallback(callbackData)) return null;

  const exportType = callbackData === 'EXPORT_EXCEL_STOCK_ALL' ? 'STOCK_ALL' : 'SALES_RANK';
  const range = callbackData.startsWith('EXPORT_EXCEL_SALES_RANK:')
    ? callbackData.split(':')[1]
    : undefined;

  const lockKey = `lock:admin_export:${chatId}:${exportType}:${range ?? 'all'}`;
  const acquired = await redisConnection.set(
    lockKey,
    '1',
    'EX',
    EXPORT_LOCK_TTL_SECONDS,
    'NX'
  );
  if (!acquired) {
    await TelegramService.editMessageByChatId(
      chatId,
      processingMessageId,
      '⏳ Already processing...',
      'Markdown'
    );
    return { enqueued: false };
  }

  await TelegramService.editMessageByChatId(
    chatId,
    processingMessageId,
    '⏳ កំពុងបង្កើត Excel...',
    'Markdown',
    {
      inline_keyboard: [[{ text: '⏳ Processing...', callback_data: 'noop' }]],
    }
  );

  const payload: TelegramAdminExportJobPayload = {
    chatId,
    requestedByUserId: adminUserId,
    processingMessageId,
    originMessageId,
    exportType,
    range: range as any,
    timezone: 'Asia/Phnom_Penh',
    restoreMenu: exportType === 'SALES_RANK' ? 'sales_rank' : 'export',
  };

  await telegramAdminExportQueue.add(
    exportType === 'STOCK_ALL'
      ? 'ADMIN_EXPORT_EXCEL_STOCK_ALL'
      : 'ADMIN_EXPORT_EXCEL_SALES_RANK',
    payload
  );

  return { enqueued: true };
}

function isStockHistorySelectCallback(data: string) {
  return data.startsWith('STOCK_HISTORY_SELECT:');
}

function isStockHistoryExportCallback(data: string) {
  return data.startsWith('STOCK_HISTORY_EXPORT:');
}

async function handleStockHistoryCallback(params: {
  chatId: number;
  callbackData: string;
  processingMessageId: number;
  adminUserId: number;
}) {
  const { chatId, callbackData, processingMessageId, adminUserId } = params;

  if (isStockHistorySelectCallback(callbackData)) {
    const productId = Number(callbackData.replace('STOCK_HISTORY_SELECT:', ''));
    if (!productId) {
      return TelegramService.editMessageByChatId(
        chatId,
        processingMessageId,
        'Invalid product.',
        'Markdown'
      );
    }
    clearStockHistoryPending(chatId);
    const tPreviewStart = Date.now();
    const preview = await TelegramAdminStockService.buildStockHistoryPreview(productId, 20);
    const tPreviewMs = Date.now() - tPreviewStart;
    logger.info('Telegram admin stock history preview', {
      chatId,
      productId,
      t_preview_ms: tPreviewMs,
    });
    return TelegramService.editMessageByChatId(
      chatId,
      processingMessageId,
      preview.text,
      preview.parseMode ?? 'Markdown',
      preview.replyMarkup
    );
  }

  if (isStockHistoryExportCallback(callbackData)) {
    const parts = callbackData.split(':');
    const productId = Number(parts[1]);
    const range = (parts[2] as '30d' | 'all') || '30d';

    if (!productId) {
      return TelegramService.editMessageByChatId(
        chatId,
        processingMessageId,
        'Invalid product.',
        'Markdown'
      );
    }

    const lockKey = `lock:stock_history_export:${chatId}:${productId}:${range}`;
    const acquired = await redisConnection.set(
      lockKey,
      '1',
      'EX',
      STOCK_HISTORY_EXPORT_LOCK_TTL_SECONDS,
      'NX'
    );
    if (!acquired) {
      return TelegramService.editMessageByChatId(
        chatId,
        processingMessageId,
        '⏳ Already processing...',
        'Markdown'
      );
    }

    await TelegramService.editMessageByChatId(
      chatId,
      processingMessageId,
      '⏳ កំពុងបង្កើត Excel... សូមរង់ចាំ',
      'Markdown',
      { inline_keyboard: [[{ text: '⏳ Processing...', callback_data: 'noop' }]] }
    );

    const payload: TelegramAdminStockHistoryExportJobPayload = {
      chatId,
      requestedByUserId: adminUserId,
      processingMessageId,
      productId,
      range,
      timezone: 'Asia/Phnom_Penh',
    };

    await telegramAdminStockHistoryExportQueue.add('ADMIN_EXPORT_STOCK_HISTORY', payload);

    return { enqueued: true };
  }

  return null;
}
