import { PendingTelegramAdminLink } from '@src/domains/TelegramAdminBot/types/telegram-admin-bot.types';

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

export const DEFAULT_EXPIRES_MINUTES = 10;
export const MAX_CUSTOM_RANGE_DAYS = 31;
export const MAX_TOP_PRODUCTS_RANGE_DAYS = 366;
export const MAX_SLOW_PRODUCTS_RANGE_DAYS = 366;
export const MAX_INCOME_RANGE_DAYS = 366;

export function getPendingKey(chatId: number) {
  return `${chatId}`;
}

export function clearAllRangePending(pendingKey: string) {
  pendingReportRanges.delete(pendingKey);
  pendingTopProductsRanges.delete(pendingKey);
  pendingSlowProductsRanges.delete(pendingKey);
  pendingIncomeRanges.delete(pendingKey);
}
