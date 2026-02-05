export interface DashboardShiftSummary {
  shift_id: number;
  status: string;
  start_time: Date;
  opening_cash: number;
}

export interface DashboardTodaySummarySeller {
  total_sales_count: number;
  total_sales_amount: number;
  expected_cash: number;
}

export interface DashboardTodaySummaryAdmin {
  total_sales_count: number;
  total_sales_amount: number;
  total_shifts: number;
  active_shifts: number;
}

export interface DashboardRecentOrderActivity {
  type: 'order';
  order_id: number;
  receipt_number: string;
  total_amount: number;
  created_at: Date;
  seller_name?: string;
}

export interface DashboardRecentStockMovementActivity {
  type: 'stock_movement';
  movement_id: number;
  product_name: string;
  movement_type: string;
  quantity: number;
  created_at: Date;
}

export interface DashboardSyncStatus {
  pending_orders: number;
  last_sync_time: Date | null;
}

export interface DashboardLowStockWarning {
  product_id: number;
  product_name: string;
  current_stock: number;
  low_stock_threshold: number;
}

export interface SellerDashboardOverview {
  shift: DashboardShiftSummary | null;
  today_summary: DashboardTodaySummarySeller;
  recent_activity: DashboardRecentOrderActivity[];
  sync_status: DashboardSyncStatus;
}

export interface AdminDashboardOverview {
  today_summary: DashboardTodaySummaryAdmin;
  low_stock_warnings: DashboardLowStockWarning[];
  recent_activity: Array<DashboardRecentOrderActivity | DashboardRecentStockMovementActivity>;
  sync_status: DashboardSyncStatus;
}
