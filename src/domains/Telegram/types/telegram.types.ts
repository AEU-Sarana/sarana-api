import type {
    DailyReportMetadata,
    DailyReportSummary,
    LowStockItem,
    ShiftBreakdown,
    TopProduct,
} from '@src/domains/Report/types/report.types';

export interface TelegramConfigInput {
    bot_token: string;
    group_chat_id: string;
    is_active?: boolean;
}

export interface TelegramConfig {
    config_id: number;
    bot_token: string; //Decrypted
    group_chat_id: string;
    is_active: boolean;
    last_test_time?: string | null;
    last_test_status?: 'SUCCESS' | 'FAILED' | null;
}


export interface TelegramConfigResponse {
    config_id: number;
    is_active: boolean;
    last_test_time?: string | null;
    last_test_status?: 'SUCCESS' | 'FAILED' | null;
}

export interface TestConnectionResponse {
    status: 'SUCCESS' | 'FAILED';
    message: string;
}

// Report Sending Types
export interface TelegramDailyReportResponse {
    date: string;
    total_sales: number;
    total_orders: number;
    total_shifts: number;
    average_order_value: number;
    currency: string;
    shifts: ShiftBreakdown[];
    top_products: TopProduct[];
    low_stock_items: LowStockItem[];
    summary: DailyReportSummary;
    metadata: DailyReportMetadata;
}

export interface SendReportResponse {
    sent: boolean;
    message_id: number;
    sent_at: string;
    report: TelegramDailyReportResponse;
}
  
// Telegram Bot API Types
export interface TelegramMessageResponse {
    success: boolean;
    messageId: number;
    sentAt: Date;
}
  
export interface TelegramBotInfo {
    id: number;
    is_bot: boolean;
    first_name: string;
    username: string;
}
  
export class TelegramAPIError extends Error {
    constructor(
      public errorCode: number,
      public description: string
    ) {
      super(`Telegram API Error ${errorCode}: ${description}`);
      this.name = 'TelegramAPIError';
    }
}
