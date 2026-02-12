export interface DailySalesReportRequest {
  date: string;
  seller_id?: number;
  bypass_cache?: boolean;
}

export interface TopProduct {
  product_id: number;
  product_name: string;
  product_code: string;
  quantity_sold: number;
  revenue: number;
  average_price: number;
}

export interface ShiftBreakdown {
  seller_id: number;
  seller_name: string;
  shift_count: number;
  total_sales: number;
  total_orders: number;
  start_time: string | null;
  end_time: string | null;
}

export interface LowStockItem {
  product_id: number;
  product_name: string;
  product_code: string;
  current_stock: number;
  low_stock_threshold: number;
  status: 'low_stock' | 'out_of_stock';
  last_updated: string;
}

export interface DailyReportSummary {
  total_products_sold: number;
  unique_products_sold: number;
  average_items_per_order: number;
  peak_sales_hour: string;
  cash_collected: number;
  short_over_amount: number;
}

export interface DailyReportMetadata {
  generated_at: string;
  data_freshness: string;
  includes_all_shifts: boolean;
  report_period: string;
}

export interface DailyReportMeta {
  request_id: string;
  processing_time_ms: number;
  cached: boolean;
  version: string;
}

export interface DailySalesReportResponse {
  date: string;
  total_sales: number;
  total_orders: number;
  total_shifts: number;
  average_order_value: number;
  currency: string;
  shifts_breakdown: ShiftBreakdown[];
  top_products: TopProduct[];
  low_stock_items: LowStockItem[];
  summary: DailyReportSummary;
  metadata: DailyReportMetadata;
}

/**
 * Sales History Report
*/
export interface SalesHistoryReportRequest {
  start_date: string;
  end_date: string;
  seller_id?: number;
  product_id?: number;
  page?: number;
  limit?: number;
}

export interface SalesHistoryItem {
  order_id: number;
  product_id: number;
  product_name: string;
  product_code: string;
  seller_id: number;
  quantity: number;
  price: number;
  total_amount: number;
  created_at: Date;
  shift_id?: number;
}

export interface SalesHistorySummary {
  total_sales: number;
  total_orders: number;
  average_daily_sales: number;
}

export interface SalesReportItem {
  date: string; // YYYY-MM-DD
  total_sales: number;
  total_orders: number;
  total_shifts: number;
}

export interface SalesHistoryReportResponse {
  sales: SalesReportItem[];
  pagination: {
    page: number;
    limit: number;
    // total is the count of distinct days with data (not total days in the requested range)
    total: number;
    totalPages: number;
  };
  summary: SalesHistorySummary;
}

/**
 * Stock Report
 */
export interface StockReportRequest {
  low_stock_only?: boolean;
}

export interface StockReportItem {
  product_id: number;
  product_name: string;
  product_code?: string;
  category?: string | null;
  current_stock: number;
  low_stock_threshold: number | null;
  status: 'in_stock' | 'low_stock' | 'out_of_stock' | 'negative';
}

export interface StockReportSummary {
  total_products: number;
  low_stock_count: number;
  out_of_stock_count: number;
  negative_stock_count: number;
}

export interface StockReportResponse {
  summary: StockReportSummary;
  stock_report: StockReportItem[];
}

/**
 * Export Reports
 */
export interface ExportReportRequest {
  report_type: 'daily_sales' | 'sales_history' | 'stock_summary' | 'stock';
  filters: DailySalesReportRequest | SalesHistoryReportRequest | StockReportRequest;
  format: 'CSV' | 'PDF' | 'csv' | 'pdf';
}

export interface ExportReportResponse {
  file_name: string;
  file_path: string;
  generated_at: Date;
}

/**
 * Income Report
 */
export type IncomeReportPeriod = 'daily' | 'weekly' | 'monthly' | 'yearly';

export interface IncomeReportResponse {
  total_sales: number;
  total_orders: number;
  totalItems: number;
  cogs: number;
  profit: number;
  purchasesCost: number;
  purchasesQty: number;
}

/**
 * Common Report Pagination
 */
export interface ReportPagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}
