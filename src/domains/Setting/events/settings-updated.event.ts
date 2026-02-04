export interface SettingsUpdatedEvent {
  setting_id: number;
  auto_backup: boolean;
  backup_frequency: string;
  device_binding_enabled: boolean;
  stock_sync_policy: string;
  updated_at: Date;
  updated_by: number;
}
