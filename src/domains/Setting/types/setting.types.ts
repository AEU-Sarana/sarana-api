// Request Types
export interface UpdateSettingsRequest {
  auto_backup: boolean;
  backup_frequency: BackupFrequency;
  backup_schedule_time?: string;
  stock_sync_policy: StockSyncPolicy;
  report_send_enabled?: boolean;
  report_send_time?: string;
  report_send_timezone?: string;
  // Invoice / Receipt info fields (optional – only saved when provided)
  store_name?: string;
  store_phone?: string;
  store_address?: string;
  store_tax_id?: string;
  store_footer_note?: string;
  is_logo_enabled?: boolean;
  is_footer_enabled?: boolean;
}

// Response Types (snake_case for API)
export interface GetSettingsResponse {
  auto_backup: boolean;
  backup_frequency: string;
  backup_schedule_time?: string;
  stock_sync_policy: string;
  report_send_enabled: boolean;
  report_send_time: string;
  report_send_timezone: string;
  updated_at: Date;
  updated_by: number;
  // Invoice / Receipt info
  store_name?: string;
  store_logo_path?: string | null;
  store_phone?: string | null;
  store_address?: string | null;
  store_tax_id?: string | null;
  store_footer_note?: string | null;
  is_logo_enabled?: boolean;
  is_footer_enabled?: boolean;
}

export interface UpdateSettingsResponse extends GetSettingsResponse {}
import { BackupFrequency, StockSyncPolicy } from '@src/domains/Setting/enums';
