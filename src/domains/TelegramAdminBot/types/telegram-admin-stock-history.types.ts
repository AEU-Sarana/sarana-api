export type StockHistoryRange = '30d' | 'all';

export type PendingStockHistoryQuery = {
  telegramUserId: number;
  startedAt: number;
};

export interface TelegramAdminStockHistoryExportJobPayload {
  chatId: number;
  requestedByUserId: number;
  processingMessageId: number;
  productId: number;
  range: StockHistoryRange;
  timezone?: string;
}
