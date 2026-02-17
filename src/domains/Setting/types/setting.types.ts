// Request Types
export interface UpdateSettingsRequest {
  auto_backup: boolean;
  backup_frequency: BackupFrequency;
  backup_schedule_time?: string;
  device_binding_enabled: boolean;
  stock_sync_policy: StockSyncPolicy;
  report_send_enabled?: boolean;
  report_send_time?: string;
  report_send_timezone?: string;
}

// Response Types (snake_case for API)
export interface GetSettingsResponse {
  auto_backup: boolean;
  backup_frequency: string;
  backup_schedule_time?: string;
  device_binding_enabled: boolean;
  stock_sync_policy: string;
  report_send_enabled: boolean;
  report_send_time: string;
  report_send_timezone: string;
  updated_at: Date;
  updated_by: number;
}

export interface UpdateSettingsResponse extends GetSettingsResponse {}
import { BackupFrequency, StockSyncPolicy } from '@src/domains/Setting/enums';
