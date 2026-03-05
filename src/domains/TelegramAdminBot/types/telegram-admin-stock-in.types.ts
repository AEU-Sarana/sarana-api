export type PendingStockInBlock = {
  telegramUserId: number;
  startedAt: number;
};

export type StockInFields = Record<string, string>;

export type StockInValidated = {
  product: {
    productId: number;
    productCode: string;
    productName: string;
    hasExpiry: boolean;
    price: number | null;
    lowStockThreshold: number | null;
    reorderPoint: number | null;
  };
  qty: number;
  cost?: number | null;
  price?: number | null;
  lowStock?: number | null;
  reorder?: number | null;
  expiredAt?: string | null;
  note?: string | null;
  warnings: string[];
};

export type StockInDraft = StockInValidated & {
  draftId: string;
  chatId: number;
  telegramUserId: number;
  adminUserId: number;
  tenantId: number;
  createdAt: number;
};

