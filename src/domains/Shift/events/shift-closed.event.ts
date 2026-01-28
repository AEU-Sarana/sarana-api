export interface ShiftClosedEvent {
    shift_id: number;
    seller_id: number;
    total_sales_count: number;
    total_sales_amount: number;
    expected_cash: number;
    actual_cash: number;
    short_amount: number;
    over_amount: number;
    closed_at: Date;
  }