export interface DailySalesReportRequest {
  date: string; 
  seller_id?: number; 
}

export interface TopProduct {
  product_id: number;
  product_name: string;
  quantity_sold: number;
  revenue: number;
}

export interface ShiftSummary {
  shift_id: number;
  seller_name: string;
  total_sales: number;
  total_orders: number;
}

export interface LowStockItem {
  product_id: number;
  product_name: string;
  product_code: string;
  quantity: number;
  low_stock_threshold: number;
}

export interface DailySalesReportResponse {
  date: string;
  summary: {
    total_sales: number;
    total_orders: number;
    total_shifts: number;
    average_order_value: number;
  };
  shifts: ShiftSummary[];
  top_products: TopProduct[];
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
  current_stock: number;
  low_stock_threshold: number | null;
  status: 'in_stock' | 'low_stock' | 'out_of_stock' | 'negative';
}

export interface StockReportSummary {
  total_products: number;
  low_stock_count: number;
  out_of_stock_count: number;
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
 * Common Report Pagination
 */
export interface ReportPagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}
