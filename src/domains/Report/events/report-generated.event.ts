export interface ReportGeneratedEvent {
  report_type: 'daily_sales' | 'sales_history' | 'stock_summary';
  filters?: Record<string, any>;
  generated_by: number;
  generated_at: Date;
}