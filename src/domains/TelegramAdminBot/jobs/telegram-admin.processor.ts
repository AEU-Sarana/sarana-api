import type { Job } from 'bullmq';
import prisma from '@src/database/client';
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
        payload.tenantId,
        chatId,
        processingMessageId,
        '⏳ Processing...',
        'Markdown'
      );
    }

    let adminUserId = 0;
    try {
      const link = await TelegramAdminLinksService.requireActiveLink(telegramUserId, chatId);
      adminUserId = link.userId;
    } catch (error: any) {
      if (error?.message === 'TELEGRAM_ADMIN_NOT_LINKED') {
        return TelegramService.editMessageByChatId(
          payload.tenantId,
          chatId,
          processingMessageId,
          'Bot មិនទាន់ភ្ជាប់ជាមួយ Admin ទេ។\nសូមប្រើ `/link CODE` (ឧ. `/link ADM-CXUJD9`).',
          'Markdown'
        );
      }
      throw error;
    }

    const exportHandled = await handleExportCallback({
      chatId,
      tenantId: payload.tenantId,
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
          payload.tenantId,
          chatId,
          prompt.text,
          prompt.replyMarkup,
          prompt.parseMode ?? 'Markdown'
        );
      } else {
        await TelegramService.sendMessageByChatId(
          payload.tenantId,
          chatId,
          prompt.text,
          prompt.parseMode ?? 'Markdown'
        );
      }

      return TelegramService.editMessageByChatId(
        payload.tenantId,
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
          payload.tenantId,
          chatId,
          prompt.text,
          prompt.replyMarkup,
          prompt.parseMode ?? 'Markdown'
        );
      } else {
        await TelegramService.sendMessageByChatId(
          payload.tenantId,
          chatId,
          prompt.text,
          prompt.parseMode ?? 'Markdown'
        );
      }

      return TelegramService.editMessageByChatId(
        payload.tenantId,
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
          payload.tenantId,
          chatId,
          prompt.text,
          prompt.replyMarkup,
          prompt.parseMode ?? 'Markdown'
        );
      } else {
        await TelegramService.sendMessageByChatId(
          payload.tenantId,
          chatId,
          prompt.text,
          prompt.parseMode ?? 'Markdown'
        );
      }

      return TelegramService.editMessageByChatId(
        payload.tenantId,
        chatId,
        processingMessageId,
        '✅',
        'Markdown'
      );
    }

    const stockHistoryHandled = await handleStockHistoryCallback({
      chatId,
      tenantId: payload.tenantId,
      callbackData,
      processingMessageId,
      adminUserId,
      telegramUserId,
    });
    if (stockHistoryHandled) return stockHistoryHandled;

    const navResult = await TelegramAdminCallbackNavService.handle(callbackData, {
      chatId,
      telegramUserId,
      tenantId: payload.tenantId,
    });
    if (navResult) {
      return TelegramService.editMessageByChatId(
        payload.tenantId,
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
      tenantId: payload.tenantId,
    });
    if (reportResult) {
      return TelegramService.editMessageByChatId(
        payload.tenantId,
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
      tenantId: payload.tenantId,
    });
    if (inventoryResult) {
      return TelegramService.editMessageByChatId(
        payload.tenantId,
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
        payload.tenantId,
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
        payload.tenantId,
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
          payload.tenantId,
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
          payload.tenantId,
          chatId,
          processingMessageId,
          '⏳ Already processing...',
          'Markdown'
        );
      }

      const result = await TelegramAdminStockService.confirmStockIn(draftId, adminUserId, payload.tenantId);
      return TelegramService.editMessageByChatId(
        payload.tenantId,
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
          payload.tenantId,
          chatId,
          processingMessageId,
          'Invalid draft.',
          'Markdown'
        );
      }

      TelegramAdminStockService.cancelStockIn(draftId);
      await TelegramService.editMessageByChatId(
        payload.tenantId,
        chatId,
        processingMessageId,
        'Cancelled.',
        'Markdown'
      );

      const menuKey = getMenuStateKey(chatId, telegramUserId);
      resetStack(menuKey);
      return renderMenu({ chatId, telegramUserId, tenantId: payload.tenantId }, 'main', { preferEdit: false });
    }

    if (callbackData.startsWith('STOCK_ADJUST_CONFIRM:')) {
      const draftId = callbackData.replace('STOCK_ADJUST_CONFIRM:', '').trim();
      if (!draftId) {
        return TelegramService.editMessageByChatId(
          payload.tenantId,
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
          payload.tenantId,
          chatId,
          processingMessageId,
          '⏳ Already processing...',
          'Markdown'
        );
      }

      const result = await TelegramAdminStockService.confirmStockAdjust(draftId, adminUserId, payload.tenantId);
      return TelegramService.editMessageByChatId(
        payload.tenantId,
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
          payload.tenantId,
          chatId,
          processingMessageId,
          'Invalid draft.',
          'Markdown'
        );
      }

      TelegramAdminStockService.cancelStockAdjust(draftId);
      await TelegramService.editMessageByChatId(
        payload.tenantId,
        chatId,
        processingMessageId,
        '❌ Canceled',
        'Markdown'
      );

      const menuKey = getMenuStateKey(chatId, telegramUserId);
      resetStack(menuKey);
      return renderMenu({ chatId, telegramUserId, tenantId: payload.tenantId }, 'update_stock', { preferEdit: false });
    }

    if (callbackData.startsWith('CONFIRM:')) {
      const action = callbackData.replace('CONFIRM:', '');
      const result = await TelegramAdminConfirmService.executeConfirmedAction(
        payload.tenantId,
        chatId,
        action,
        adminUserId
      );
      return result ?? null;
    }

    return TelegramService.editMessageByChatId(
      payload.tenantId,
      chatId,
      processingMessageId,
      'Unknown action.',
      'Markdown'
    );
  } catch (error: any) {
    logger.error('Telegram admin callback job failed', { error: error.message });
    return TelegramService.editMessageByChatId(
      payload.tenantId,
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

    // Verify admin link for all commands (except /link which handles its own check)
    let adminUserId = 0;
    let isAdmin = false;
    try {
      const link = await TelegramAdminLinksService.requireActiveLink(telegramUserId, chatId);
      adminUserId = link.userId;
      isAdmin = true;
    } catch (error: any) {
      if (error?.message === 'TELEGRAM_ADMIN_NOT_LINKED') {
        isAdmin = false;
      } else {
        throw error;
      }
    }

    if (command.type === 'START') {
      if (isAdmin) {
        const menuKey = getMenuStateKey(chatId, telegramUserId);
        resetStack(menuKey);
        return renderMenu({ chatId, telegramUserId, tenantId: payload.tenantId }, 'main', { preferEdit: false });
      } else {
        // Fetch store name from settings
        const settings = await prisma.receiptSetting.findFirst({
          orderBy: { updatedAt: 'desc' }
        });
        const storeName = settings?.storeName || 'Phument Mart';

        // Non-admin welcome message
        return TelegramService.sendMessageByChatId(
          payload.tenantId,
          chatId,
          `សូមស្វាគមន៍មកកាន់ **${storeName}**! 🙏\n\nនេះគឺជាគណនី Telegram ផ្លូវការសម្រាប់ទទួលបានវិក្កយបត្រស្វ័យប្រវត្តិ។\n\nដើម្បីទទួលបានវិក្កយបត្រ សូមកុំភ្លេចស្កេន QR Code នៅលើវិក្កយបត្ររបស់អ្នកបាទ។`,
          'Markdown'
        );
      }
    }

    if (!isAdmin) {
      const message = 'សុំទោស! អ្នកមិនមានសិទ្ធិចូលប្រើប្រាស់ Admin Menu ទេបាទ។\nប្រសិនបើអ្នកជា Admin សូមប្រើ `/link CODE` ដើម្បីភ្ជាប់គណនី។';
      if (processingMessageId) {
        return TelegramService.editMessageByChatId(payload.tenantId, chatId, processingMessageId, message, 'Markdown');
      }
      return TelegramService.sendMessageByChatId(payload.tenantId, chatId, message, 'Markdown');
    }

    const pendingKey = getPendingKey(chatId);
    if (pendingReportRanges.has(pendingKey) && processingMessageId) {
      const result = await TelegramAdminReportService.handleReportRangeInputResult(
        pendingKey,
        chatId,
        text,
        adminUserId,
        telegramUserId,
        payload.tenantId
      );
      if (result) {
        return TelegramService.editMessageByChatId(
          payload.tenantId,
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
        telegramUserId,
        payload.tenantId
      );
      if (result) {
        return TelegramService.editMessageByChatId(
          payload.tenantId,
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
        telegramUserId,
        payload.tenantId
      );
      if (result) {
        return TelegramService.editMessageByChatId(
          payload.tenantId,
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
        telegramUserId,
        payload.tenantId
      );
      if (result) {
        return TelegramService.editMessageByChatId(
          payload.tenantId,
          chatId,
          processingMessageId,
          result.text,
          result.parseMode ?? 'Markdown',
          result.replyMarkup
        );
      }
    }

    const pendingStockHistory = getStockHistoryPending(chatId, telegramUserId);
    if (pendingStockHistory && processingMessageId) {
      if (pendingStockHistory.telegramUserId !== telegramUserId) {
        return TelegramService.editMessageByChatId(
          payload.tenantId,
          chatId,
          processingMessageId,
          'Another user is completing a stock history query. Please wait.',
          'Markdown'
        );
      }

      const trimmed = text.trim();
      if (trimmed.toLowerCase() === '/cancel') {
        clearStockHistoryPending(chatId, telegramUserId);
        await TelegramService.editMessageByChatId(
          payload.tenantId,
          chatId,
          processingMessageId,
          'Cancelled.',
          'Markdown'
        );
        const menuKey = getMenuStateKey(chatId, telegramUserId);
        resetStack(menuKey);
        return renderMenu({ chatId, telegramUserId, tenantId: payload.tenantId }, 'main', { preferEdit: false });
      }

      const tSearchStart = Date.now();
      const products = await TelegramAdminStockService.findProductsByQuery(trimmed, payload.tenantId);
      const tSearchMs = Date.now() - tSearchStart;
      logger.info('Telegram admin stock history search', {
        chatId,
        query: trimmed,
        results: products.length,
        t_search_ms: tSearchMs,
      });

      if (!products.length) {
        return TelegramService.editMessageByChatId(
          payload.tenantId,
          chatId,
          processingMessageId,
          'រកមិនឃើញទំនិញ\nសូមបញ្ចូល Product Code ឬ Product Name ម្តងទៀត។',
          'Markdown'
        );
      }

      if (products.length === 1) {
        clearStockHistoryPending(chatId, telegramUserId);
        const tPreviewStart = Date.now();
        const preview = await TelegramAdminStockService.buildStockHistoryPreview(
          products[0].productId,
          payload.tenantId,
          20
        );
        const tPreviewMs = Date.now() - tPreviewStart;
        logger.info('Telegram admin stock history preview', {
          chatId,
          productId: products[0].productId,
          t_preview_ms: tPreviewMs,
        });
        return TelegramService.editMessageByChatId(
          payload.tenantId,
          chatId,
          processingMessageId,
          preview.text,
          preview.parseMode ?? 'Markdown',
          preview.replyMarkup
        );
      }

      return TelegramService.editMessageByChatId(
        payload.tenantId,
        chatId,
        processingMessageId,
        'សូមជ្រើសរើសទំនិញ៖',
        'Markdown',
        TelegramAdminStockService.buildStockHistorySelectKeyboard(products)
      );
    }

    const pendingStockIn = getStockInPending(chatId, telegramUserId);
    if (pendingStockIn && processingMessageId) {
      if (pendingStockIn.telegramUserId !== telegramUserId) {
        return TelegramService.editMessageByChatId(
          payload.tenantId,
          chatId,
          processingMessageId,
          'Another user is completing a stock in request. Please wait.',
          'Markdown'
        );
      }

      const trimmed = text.trim();
      if (trimmed.toLowerCase() === '/cancel') {
        clearStockInPending(chatId, telegramUserId);
        await TelegramService.editMessageByChatId(
          payload.tenantId,
          chatId,
          processingMessageId,
          'Cancelled.',
          'Markdown'
        );
        const menuKey = getMenuStateKey(chatId, telegramUserId);
        resetStack(menuKey);
        return renderMenu({ chatId, telegramUserId, tenantId: payload.tenantId }, 'main', { preferEdit: false });
      }

      const result = await TelegramAdminStockService.handleStockInBlockInput(
        chatId,
        trimmed,
        adminUserId,
        telegramUserId,
        payload.tenantId
      );
      return TelegramService.editMessageByChatId(
        payload.tenantId,
        chatId,
        processingMessageId,
        result.text,
        result.parseMode ?? 'Markdown',
        result.replyMarkup
      );
    }

    if (command.type === 'PRODUCT_LOOKUP') {
      return TelegramAdminStockService.handleProductLookup(command.productCode, adminUserId, payload.tenantId);
    }

    if (command.type === 'STOCK_WRITE') {
      return TelegramAdminStockService.handleStockWrite(command, text, telegramUserId, adminUserId, payload.tenantId);
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
        telegramUserId,
        payload.tenantId
      );
      return TelegramService.editMessageByChatId(
        payload.tenantId,
        chatId,
        processingMessageId,
        result.text,
        result.parseMode ?? 'Markdown',
        result.replyMarkup
      );
    }

    if (command.type === 'LOWSTOCK') {
      const result = await TelegramAdminInventoryService.buildLowStockMessage(adminUserId, payload.tenantId);
      return TelegramService.editMessageByChatId(
        payload.tenantId,
        chatId,
        processingMessageId,
        result.text,
        result.parseMode ?? 'Markdown',
        result.replyMarkup
      );
    }

    if (command.type === 'SHIFT_SUMMARY') {
      const result = await TelegramAdminInventoryService.buildShiftSummaryMessage(adminUserId, payload.tenantId);
      return TelegramService.editMessageByChatId(
        payload.tenantId,
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
        payload.tenantId,
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
        payload.tenantId,
        chatId,
        processingMessageId,
        prompt.text,
        prompt.parseMode ?? 'Markdown',
        prompt.replyMarkup
      );
    }

    return TelegramService.editMessageByChatId(
      payload.tenantId,
      chatId,
      processingMessageId,
      'Unknown command.',
      'Markdown'
    );
  } catch (error: any) {
    logger.error('Telegram admin message job failed', {
      error: error.message,
      stack: error.stack,
      chatId,
      telegramUserId
    });

    // Only show the specific error message if it's a known user-friendly error
    const friendlyErrors = ['TELEGRAM_ADMIN_NOT_LINKED', 'Unauthorized', 'Invalid code'];
    const displayMessage = friendlyErrors.includes(error?.message)
      ? `❌ ${error.message}`
      : '❌ មានបញ្ហាបច្ចេកទេសមួយបានកើតឡើង។ សូមព្យាយាមម្ដងទៀតនៅពេលក្រោយបាទ។';

    if (processingMessageId) {
      return TelegramService.editMessageByChatId(
        payload.tenantId,
        chatId,
        processingMessageId,
        displayMessage,
        'Markdown'
      );
    }
    return TelegramService.sendMessageByChatId(payload.tenantId, chatId, displayMessage, 'Markdown');
  }
}

const EXPORT_LOCK_TTL_SECONDS = 20;
const STOCK_HISTORY_EXPORT_LOCK_TTL_SECONDS = 20;

function isExportCallback(data: string) {
  return data === 'EXPORT_EXCEL_STOCK_ALL' || data.startsWith('EXPORT_EXCEL_SALES_RANK:');
}

async function handleExportCallback(params: {
  chatId: number;
  tenantId: number;
  telegramUserId: number;
  adminUserId: number;
  callbackData: string;
  processingMessageId: number;
  originMessageId?: number;
}) {
  const { chatId, tenantId, adminUserId, callbackData, processingMessageId, originMessageId } = params;

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
      tenantId,
      chatId,
      processingMessageId,
      '⏳ Already processing...',
      'Markdown'
    );
    return { enqueued: false };
  }

  await TelegramService.editMessageByChatId(
    tenantId,
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
    tenantId,
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
  tenantId: number;
  callbackData: string;
  processingMessageId: number;
  adminUserId: number;
  telegramUserId: number;
}) {
  const { chatId, tenantId, callbackData, processingMessageId, adminUserId, telegramUserId } = params;

  if (isStockHistorySelectCallback(callbackData)) {
    const productId = Number(callbackData.replace('STOCK_HISTORY_SELECT:', ''));
    if (!productId) {
      return TelegramService.editMessageByChatId(
        tenantId,
        chatId,
        processingMessageId,
        'Invalid product.',
        'Markdown'
      );
    }
    clearStockHistoryPending(chatId, telegramUserId);
    const tPreviewStart = Date.now();
    const preview = await TelegramAdminStockService.buildStockHistoryPreview(productId, tenantId, 20);
    const tPreviewMs = Date.now() - tPreviewStart;
    logger.info('Telegram admin stock history preview', {
      chatId,
      productId,
      t_preview_ms: tPreviewMs,
    });
    return TelegramService.editMessageByChatId(
      tenantId,
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
        tenantId,
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
        tenantId,
        chatId,
        processingMessageId,
        '⏳ Already processing...',
        'Markdown'
      );
    }

    await TelegramService.editMessageByChatId(
      tenantId,
      chatId,
      processingMessageId,
      '⏳ កំពុងបង្កើត Excel... សូមរង់ចាំ',
      'Markdown',
      { inline_keyboard: [[{ text: '⏳ Processing...', callback_data: 'noop' }]] }
    );

    const payload: TelegramAdminStockHistoryExportJobPayload = {
      chatId,
      tenantId,
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
