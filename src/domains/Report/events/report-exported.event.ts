export interface ReportExportedEvent {
  report_type: 'daily_sales' | 'sales_history' | 'stock_summary';
  file_name: string;
  file_path: string;
  exported_by: number;
  exported_at: Date;
}
