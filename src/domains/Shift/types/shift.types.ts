export interface StartShiftRequest {
  opening_cash: number;
  exchange_rate: number;
}

export interface ShiftProductStock {
  quantity: number;
  stock_version: number | null;
}

export interface ShiftProduct {
  product_id: number;
  product_code: string;
  product_name: string;
  price: number | null;
  stock: ShiftProductStock;
}

export interface ShiftStockSnapshot {
  version: number | null;
  last_sync_time: string | null;
  products: ShiftProduct[];
}

export interface StartShiftResponse {
  shift_id: number;
  seller_id: number;
  shift_date: string;
  start_time: string;
  opening_cash: number;
  status: string;
  stock: ShiftStockSnapshot;
  created_at: string;
}

export interface CloseShiftRequest {
  actual_cash: number;
  pending_orders_count: number;
  last_order_sync_at?: string;
  close_mode?: 'NORMAL' | 'FORCED';
  force_close?: boolean;
  force_close_reason?: string;
}

export interface CloseShiftResponse {
  shift_id: number;
  end_time: Date;
  actual_cash: number;
  expected_cash: number;
  short_amount: number;
  over_amount: number;
  total_sales_count: number;
  total_sales_amount: number;
  status: string;
  report_sent_status: string;
  updated_at: Date;
}

export interface ListShiftsRequest {
  page?: number;
  limit?: number;
  seller_id?: number;
  status?: string;
  start_date?: string;
  end_date?: string;
}

export interface ListShiftItem {
  shift_id: number;
  seller_id: number;
  seller_name: string | null;
  shift_date: string;
  start_time: Date;
  end_time: Date | null;
  opening_cash: number;
  actual_cash: number | null;
  total_sales_count: number;
  total_sales_amount: number;
  exchange_rate: number;
  status: string;
  created_at: Date;
}

export interface SellerInfo {
  id: number;
  name: string;
}

export interface ListShiftsResponse {
  shifts: ListShiftItem[];
  sellers: SellerInfo[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
}

export interface GetShiftResponse {
  shift_id: number;
  seller_id: number;
  seller_name: string | null;
  stock_version: number | null;
  shift_date: string;
  start_time: Date;
  end_time: Date | null;
  opening_cash: number;
  expected_cash: number | null;
  actual_cash: number | null;
  short_amount: number | null;
  over_amount: number | null;
  total_sales_count: number;
  total_sales_amount: number;
  exchange_rate: number;
  status: string;
  report_sent_status: string;
  orders: Array<{
    order_id: number;
    receipt_number: string;
    order_date: Date;
    total_amount: number;
  }>;
  created_at: Date;
  updated_at: Date;
}

export interface GetShiftReconciliationResponse {
  shift_id: number;
  reconciliation: {
    expected_cash: number;
    actual_cash: number;
    difference: number;
    orders_summary: { total_orders: number; total_amount: number; cash_collected: number };
    stock_movements: Array<{
      product_id: number;
      product_name: string | null;
      quantity_sold: number;
      stock_deduction: number;
    }>;
    stockConflicts: Array<{
      product_id: number;
      product_name: string | null;
      expected_quantity: number;
      actual_quantity: number;
      difference: number;
    }>;
    negativeStockWarnings: Array<{
      product_id: number;
      product_name: string | null;
      expected_quantity: number;
      actual_quantity: number;
      reason: 'EXPECTED_NEGATIVE' | 'ACTUAL_NEGATIVE' | 'BOTH_NEGATIVE';
    }>;
    priceMismatches: Array<{
      product_id: number;
      product_name: string | null;
      order_item_id: number;
      expected_price: number;
      actual_price: number;
    }>;
  };
}
