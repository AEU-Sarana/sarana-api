export interface CreateReceiptLinkResponse {
  receipt_link_id: number;
  order_id: number;
  code: string;
  link_status: 'PENDING' | 'USED' | 'EXPIRED' | 'REVOKED';
  expires_at: string;
  telegram_deep_link: string;
}

export interface TelegramReceiptClaimRequest {
  code: string;
  telegram_user_id: string;
  telegram_chat_id: string;
  telegram_username?: string;
}

export interface TelegramReceiptClaimResponse {
  order_id: number;
  receipt_number: string;
  link_status: 'USED';
  receipt_text: string;
}

export interface ReceiptSettingsResponse {
  setting_id: number;
  store_name: string;
  logo_path: string | null;
  phone: string | null;
  address: string | null;
  tax_id: string | null;
  footer_note: string | null;
  is_logo_enabled: boolean;
  is_footer_enabled: boolean;
  updated_at: string;
  created_at: string;
}

export interface ReceiptSettingsUpdateRequest {
  store_name: string;
  phone?: string | null;
  address?: string | null;
  tax_id?: string | null;
  footer_note?: string | null;
  is_logo_enabled?: boolean;
  is_footer_enabled?: boolean;
}