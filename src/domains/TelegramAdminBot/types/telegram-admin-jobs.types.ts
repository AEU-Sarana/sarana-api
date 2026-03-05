export type TelegramAdminJobName = 'HANDLE_CALLBACK' | 'HANDLE_MESSAGE';

export interface TelegramAdminCallbackJobPayload {
  chatId: number;
  tenantId: number;
  callbackData: string;
  callbackQueryId?: string;
  processingMessageId: number;
  telegramUserId: number;
  messageId?: number;
}

export interface TelegramAdminMessageJobPayload {
  chatId: number;
  tenantId: number;
  text?: string;
  telegramUserId: number;
  processingMessageId?: number;
}

export type TelegramAdminJobPayload =
  | TelegramAdminCallbackJobPayload
  | TelegramAdminMessageJobPayload;
