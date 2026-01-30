export interface TelegramConfigUpdatedEvent {
  config_id: number;
  is_active: boolean;
  updated_by: number;
  updated_at: Date;
}

