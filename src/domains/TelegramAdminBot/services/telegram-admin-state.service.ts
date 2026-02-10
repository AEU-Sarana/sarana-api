import { PendingTelegramAdminLink } from '@src/domains/TelegramAdminBot/types/telegram-admin-bot.types';
import type { PendingStockHistoryQuery } from '@src/domains/TelegramAdminBot/types/telegram-admin-stock-history.types';
import type { StockInDraft, PendingStockInBlock } from '@src/domains/TelegramAdminBot/types/telegram-admin-stock-in.types';
import type { PendingStockAdjustBlock, StockAdjustDraft } from '@src/domains/TelegramAdminBot/types/telegram-admin-stock-adjust.types';

export type PendingRange = {
  step: 'START' | 'END';
  startDate?: string;
  telegramUserId: number;
};

export const pendingLinks = new Map<string, PendingTelegramAdminLink>();
export const pendingReportRanges = new Map<string, PendingRange>();
export const pendingTopProductsRanges = new Map<string, PendingRange>();
export const pendingSlowProductsRanges = new Map<string, PendingRange>();
export const pendingIncomeRanges = new Map<string, PendingRange>();
export const pendingStockHistoryQueries = new Map<string, PendingStockHistoryQuery>();
export const pendingStockInBlocks = new Map<string, PendingStockInBlock>();
export const stockInDrafts = new Map<string, StockInDraft>();
export const pendingStockAdjustBlocks = new Map<string, PendingStockAdjustBlock>();
export const stockAdjustDrafts = new Map<string, StockAdjustDraft>();
export const linkAttempts = new Map<string, { count: number; lastAttempt: number }>();

export const DEFAULT_EXPIRES_MINUTES = 10;
export const MAX_CUSTOM_RANGE_DAYS = 31;
export const MAX_TOP_PRODUCTS_RANGE_DAYS = 366;
export const MAX_SLOW_PRODUCTS_RANGE_DAYS = 366;
export const MAX_INCOME_RANGE_DAYS = 366;

export function getPendingKey(chatId: number) {
  return `${chatId}`;
}

export function getUserPendingKey(chatId: number, telegramUserId: number) {
  return `${chatId}:${telegramUserId}`;
}

export function clearAllRangePending(pendingKey: string) {
  pendingReportRanges.delete(pendingKey);
  pendingTopProductsRanges.delete(pendingKey);
  pendingSlowProductsRanges.delete(pendingKey);
  pendingIncomeRanges.delete(pendingKey);
}

export function setStockHistoryPending(chatId: number, telegramUserId: number) {
  pendingStockHistoryQueries.set(getUserPendingKey(chatId, telegramUserId), {
    telegramUserId,
    startedAt: Date.now(),
  });
}

export function clearStockHistoryPending(chatId: number, telegramUserId: number) {
  pendingStockHistoryQueries.delete(getUserPendingKey(chatId, telegramUserId));
}

export function getStockHistoryPending(chatId: number, telegramUserId: number) {
  return pendingStockHistoryQueries.get(getUserPendingKey(chatId, telegramUserId));
}

export function setStockInPending(chatId: number, telegramUserId: number) {
  pendingStockInBlocks.set(getUserPendingKey(chatId, telegramUserId), {
    telegramUserId,
    startedAt: Date.now(),
  });
}

export function clearStockInPending(chatId: number, telegramUserId: number) {
  pendingStockInBlocks.delete(getUserPendingKey(chatId, telegramUserId));
}

export function getStockInPending(chatId: number, telegramUserId: number) {
  return pendingStockInBlocks.get(getUserPendingKey(chatId, telegramUserId));
}

export function saveStockInDraft(draft: StockInDraft) {
  stockInDrafts.set(draft.draftId, draft);
}

export function getStockInDraft(draftId: string) {
  return stockInDrafts.get(draftId);
}

export function clearStockInDraft(draftId: string) {
  stockInDrafts.delete(draftId);
}

export function setStockAdjustPending(chatId: number, telegramUserId: number) {
  pendingStockAdjustBlocks.set(getUserPendingKey(chatId, telegramUserId), {
    telegramUserId,
    startedAt: Date.now(),
  });
}

export function clearStockAdjustPending(chatId: number, telegramUserId: number) {
  pendingStockAdjustBlocks.delete(getUserPendingKey(chatId, telegramUserId));
}

export function getStockAdjustPending(chatId: number, telegramUserId: number) {
  return pendingStockAdjustBlocks.get(getUserPendingKey(chatId, telegramUserId));
}

export function saveStockAdjustDraft(draft: StockAdjustDraft) {
  stockAdjustDrafts.set(draft.draftId, draft);
}

export function getStockAdjustDraft(draftId: string) {
  return stockAdjustDrafts.get(draftId);
}

export function clearStockAdjustDraft(draftId: string) {
  stockAdjustDrafts.delete(draftId);
}
