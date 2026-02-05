export interface SettingsUpdatedEvent {
  setting_id: number;
  auto_backup: boolean;
  backup_frequency: string;
  device_binding_enabled: boolean;
  stock_sync_policy: string;
  report_send_enabled: boolean;
  report_send_time: string;
  report_send_timezone: string;
  updated_at: Date;
  updated_by: number;
}
