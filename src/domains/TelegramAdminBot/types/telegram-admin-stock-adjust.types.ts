export type PendingStockAdjustBlock = {
  telegramUserId: number;
  startedAt: number;
};

export type StockAdjustDraft = {
  draftId: string;
  chatId: number;
  telegramUserId: number;
  adminUserId: number;
  tenantId: number;
  createdAt: number;
  expiresAt: number;
  productId: number;
  productCode: string;
  productName: string;
  qty: number;
  reason: string;
  note?: string | null;
  currentOnHand: number;
  newOnHand: number;
  warnings: string[];
};
