export interface TelegramWebhookPayload {
  update_id: number;
  message?: any;
  callback_query?: any;
}

export interface TelegramAdminBotConfig {
  botToken: string;
  chatId: string;
}

export type TelegramAdminCommand =
  | { type: 'REPORT'; date: string }
  | { type: 'LOWSTOCK' }
  | { type: 'PRODUCT_LOOKUP'; productCode?: string }
  | {
      type: 'STOCK_WRITE';
      requestId?: string;
      movementType?: string;
      productCode?: string;
      qty?: number;
    }
  | { type: 'UNKNOWN' };
