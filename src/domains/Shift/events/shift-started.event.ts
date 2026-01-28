export interface ShiftStartedEvent {
    shift_id: number;
    seller_id: number;
    opening_cash: number;
    stock_version_at_start: number;
    started_at: Date;
  }