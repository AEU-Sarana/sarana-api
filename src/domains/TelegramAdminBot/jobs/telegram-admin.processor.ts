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
} from '@src/domains/TelegramAdminBot/services/telegram-admin-state.service';

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
    const link = await TelegramAdminLinksService.requireActiveLink(telegramUserId, chatId);
    const adminUserId = link.userId;

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
