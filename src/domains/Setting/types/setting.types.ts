// Request Types
export interface UpdateSettingsRequest {
  auto_backup: boolean;
  backup_frequency: BackupFrequency;
  device_binding_enabled: boolean;
  stock_sync_policy: StockSyncPolicy;
}

// Response Types (snake_case for API)
export interface GetSettingsResponse {
  auto_backup: boolean;
  backup_frequency: string;
  device_binding_enabled: boolean;
  stock_sync_policy: string;
  updated_at: Date;
  updated_by: number;
}

export interface UpdateSettingsResponse extends GetSettingsResponse {}
import { BackupFrequency, StockSyncPolicy } from '@src/domains/Setting/enums';
