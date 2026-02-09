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
  | { type: 'START' }
  | { type: 'RECEIPT_START'; code: string }
  | { type: 'REPORT'; date: string }
  | { type: 'LOWSTOCK' }
  | { type: 'SHIFT_SUMMARY' }
  | { type: 'RESEND_LAST_REPORT' }
  | { type: 'UNLINK_BOT' }
  | { type: 'PRODUCT_LOOKUP'; productCode?: string }
  | {
      type: 'STOCK_WRITE';
      requestId?: string;
      movementType?: string;
      productCode?: string;
      qty?: number;
    }
  | { type: 'UNKNOWN' };

export type TelegramAdminLinkStatus = 'PENDING' | 'ACTIVE' | 'REVOKED';

export interface CreateTelegramAdminLinkRequest {
  admin_user_id: number;
  telegram_user_id?: number;
  telegram_username?: string;
  expires_in_minutes?: number; 
}

export interface CreateTelegramAdminLinkResponse {
  link_code: string;
  expires_at: string;
  link_status: TelegramAdminLinkStatus; 
}

export interface PendingTelegramAdminLink {
  adminUserId: number;
  telegramUserId?: number;
  telegramUsername?: string;
  expiresAtMs: number;
}
