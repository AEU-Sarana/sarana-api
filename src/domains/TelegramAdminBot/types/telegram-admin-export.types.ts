export type AdminExportType = 'STOCK_ALL' | 'SALES_RANK';
export type AdminExportRange = 'today' | 'week' | 'month' | 'all';
export type AdminExportRestoreMenu = 'export' | 'sales_rank';

export interface TelegramAdminExportJobPayload {
  chatId: number;
  tenantId: number;
  requestedByUserId: number;
  processingMessageId: number;
  originMessageId?: number;
  exportType: AdminExportType;
  range?: AdminExportRange;
  timezone?: string;
  restoreMenu?: AdminExportRestoreMenu;
}
