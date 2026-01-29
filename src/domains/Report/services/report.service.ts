import prisma from '@src/database/client';
import { DailySalesReportRequest, DailySalesReportResponse, SalesHistoryReportRequest, SalesHistoryReportResponse, StockReportRequest, StockReportResponse, ExportReportRequest, ExportReportResponse, TopProduct, ShiftSummary, LowStockItem } from '../types/report.types';
import { ReportType } from '../enums/report-type.enum';
import { ReportExportFormat } from '../enums/export-format.enum';
import { ValidationException } from '@src/shared/exceptions';
import { logger } from '@src/shared/utils/logger';
import { ReportCacheService } from './report-cache.service';
import { ReportExportService } from './report-export.service';
import { eventBus } from '@src/shared/events/event-bus';
import { ReportGeneratedEvent } from '../events/report-generated.event';
import { ReportExportedEvent } from '../events/report-exported.event';
import { Prisma } from '@src/database/generated/client';

export class ReportService {

  /**
   * Daily Sales Report
   */
  static async getDailyReport(request: DailySalesReportRequest, currentUserId: number): Promise<DailySalesReportResponse> {
    try {
      const { date, seller_id } = request;

      // Validate date format
      if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        throw new ValidationException('Invalid date format. Expected YYYY-MM-DD');
      }

      // Cache check
      const cacheKey = `daily_report:${date}:${seller_id || 'all'}`;
      const cached = await ReportCacheService.getCached(cacheKey);
      if (cached) return cached;

      // Aggregate total sales, total orders
      const startOfDay = new Date(`${date}T00:00:00Z`);
      const endOfDay = new Date(`${date}T23:59:59Z`);
      
      // Validate date is valid
      if (isNaN(startOfDay.getTime()) || isNaN(endOfDay.getTime())) {
        throw new ValidationException('Invalid date provided');
      }

    const whereClause: any = {
      createdAt: {
        gte: startOfDay,
        lte: endOfDay,
      },
    };
    if (seller_id) {
      whereClause.sellerId = seller_id;
    }

    const aggregations = await prisma.order.aggregate({
      where: whereClause,
      _sum: {
        totalAmount: true,
      },
      _count: {
        orderId: true,
      },
    });

    const total_sales = Number(aggregations._sum.totalAmount || 0);
    const total_orders = aggregations._count.orderId;
    const average_order_value = total_orders > 0 ? total_sales / total_orders : 0;

    // Shifts breakdown
    const shiftsData = await prisma.shift.findMany({
      where: {
        shiftDate: {
          gte: startOfDay,
          lte: endOfDay
        }, // Approximate, might need better date filtering based on shiftDate type
        ...(seller_id ? { sellerId: seller_id } : {}),
      },
      include: {
        seller: { select: { fullName: true } },
        orders: {
          where: {
            createdAt: {
              gte: startOfDay,
              lte: endOfDay,
            }
          },
          select: { totalAmount: true }
        }
      }
    });

    const shifts: ShiftSummary[] = shiftsData.map(s => {
      const shiftTotal = s.orders.reduce((sum, o) => sum + Number(o.totalAmount), 0);
      const shiftOrders = s.orders.length;
      return {
        shift_id: s.shiftId,
        seller_name: s.seller?.fullName || 'Unknown',
        total_sales: shiftTotal,
        total_orders: shiftOrders,
      };
    });


    // Top products
    // We need to group by productId in OrderItems, but filtering by Order date
    const topProductsRaw = await prisma.orderItem.groupBy({
      by: ['productId', 'productName'], // productName is in OrderItem schema we checked? Wait, let's re-verify schema.
      // Schema says: OrderItem has productId, productName. YES.
      where: {
        order: {
          createdAt: {
            gte: startOfDay,
            lte: endOfDay,
          },
          ...(seller_id ? { sellerId: seller_id } : {}),
        },
      },
      _sum: {
        quantity: true,
        subtotal: true,
      },
      orderBy: {
        _sum: {
          subtotal: 'desc',
        },
      },
      take: 10,
    });

    const top_products: TopProduct[] = topProductsRaw.map(p => ({
      product_id: p.productId,
      product_name: p.productName,
      quantity_sold: p._sum.quantity || 0,
      revenue: Number(p._sum.subtotal || 0),
    }));

    const report: DailySalesReportResponse = {
      date,
      summary: {
        total_sales,
        total_orders,
        total_shifts: shifts.length,
        average_order_value,
      },
      shifts,
      top_products,
    };

      // Cache result for 10 minutes
      await ReportCacheService.setCached(cacheKey, report, 600);

      // Emit event
      eventBus.emit('reports.generated', {
        report_type: ReportType.DAILY_SALES,
        filters: { date, seller_id },
        generated_by: currentUserId,
        generated_at: new Date(),
      } satisfies ReportGeneratedEvent);

      return report;
    } catch (error: any) {
      logger.error('Error generating daily report', {
        error: error.message,
        stack: error.stack,
        userId: currentUserId,
        date: request.date,
        seller_id: request.seller_id,
      });
      throw error;
    }
  }

  /**
   * Sales History Report
   */
  static async getSalesHistoryReport(request: SalesHistoryReportRequest, currentUserId: number): Promise<SalesHistoryReportResponse> {
    try {
      const { start_date, end_date, seller_id, product_id, page = 1, limit = 50 } = request;

      // Validate date formats
      if (!start_date || !/^\d{4}-\d{2}-\d{2}$/.test(start_date)) {
        throw new ValidationException('Invalid start_date format. Expected YYYY-MM-DD');
      }
      if (!end_date || !/^\d{4}-\d{2}-\d{2}$/.test(end_date)) {
        throw new ValidationException('Invalid end_date format. Expected YYYY-MM-DD');
      }

      // Validate date range
      const startDate = new Date(`${start_date}T00:00:00Z`);
      const endDate = new Date(`${end_date}T23:59:59Z`);
      if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
        throw new ValidationException('Invalid date range provided');
      }
      if (startDate > endDate) {
        throw new ValidationException('start_date must be before or equal to end_date');
      }

      // Validate pagination
      if (page < 1) {
        throw new ValidationException('page must be greater than 0');
      }
      if (limit < 1 || limit > 100) {
        throw new ValidationException('limit must be between 1 and 100');
      }

      const offset = (page - 1) * limit;

      // Aggregate per-day sales
      // If product_id is provided, total_sales is based on order_items.subtotal for that product.
      type SalesRow = { date: string; total_sales: any; total_orders: any; total_shifts: any };

      let sales: SalesRow[] = [];
      let totalDays = 0;
      let total_sales = 0;
      let total_orders_count = 0;

      if (product_id) {
        sales = await prisma.$queryRaw<SalesRow[]>(Prisma.sql`
          SELECT
            to_char(date_trunc('day', o.created_at), 'YYYY-MM-DD') AS date,
            COALESCE(SUM(oi.subtotal), 0) AS total_sales,
            COUNT(DISTINCT o.order_id) AS total_orders,
            COUNT(DISTINCT o.shift_id) AS total_shifts
          FROM orders o
          JOIN order_items oi ON oi.order_id = o.order_id
          WHERE o.created_at >= ${startDate}
            AND o.created_at <= ${endDate}
            AND oi.product_id = ${product_id}
            AND (${seller_id}::int IS NULL OR o.seller_id = ${seller_id})
          GROUP BY 1
          ORDER BY 1 DESC
          OFFSET ${offset} LIMIT ${limit}
        `);

        const totals = await prisma.$queryRaw<{ total_days: any; total_sales: any; total_orders: any }[]>(Prisma.sql`
          SELECT
            COUNT(*) AS total_days,
            COALESCE(SUM(day_sales), 0) AS total_sales,
            COALESCE(SUM(day_orders), 0) AS total_orders
          FROM (
            SELECT
              date_trunc('day', o.created_at) AS day,
              COALESCE(SUM(oi.subtotal), 0) AS day_sales,
              COUNT(DISTINCT o.order_id) AS day_orders
            FROM orders o
            JOIN order_items oi ON oi.order_id = o.order_id
            WHERE o.created_at >= ${startDate}
              AND o.created_at <= ${endDate}
              AND oi.product_id = ${product_id}
              AND (${seller_id}::int IS NULL OR o.seller_id = ${seller_id})
            GROUP BY 1
          ) t
        `);

        totalDays = Number(totals[0]?.total_days || 0);
        total_sales = Number(totals[0]?.total_sales || 0);
        total_orders_count = Number(totals[0]?.total_orders || 0);
      } else {
        sales = await prisma.$queryRaw<SalesRow[]>(Prisma.sql`
          SELECT
            to_char(date_trunc('day', o.created_at), 'YYYY-MM-DD') AS date,
            COALESCE(SUM(o.total_amount), 0) AS total_sales,
            COUNT(DISTINCT o.order_id) AS total_orders,
            COUNT(DISTINCT o.shift_id) AS total_shifts
          FROM orders o
          WHERE o.created_at >= ${startDate}
            AND o.created_at <= ${endDate}
            AND (${seller_id}::int IS NULL OR o.seller_id = ${seller_id})
          GROUP BY 1
          ORDER BY 1 DESC
          OFFSET ${offset} LIMIT ${limit}
        `);

        const totals = await prisma.$queryRaw<{ total_days: any; total_sales: any; total_orders: any }[]>(Prisma.sql`
          SELECT
            COUNT(*) AS total_days,
            COALESCE(SUM(day_sales), 0) AS total_sales,
            COALESCE(SUM(day_orders), 0) AS total_orders
          FROM (
            SELECT
              date_trunc('day', o.created_at) AS day,
              COALESCE(SUM(o.total_amount), 0) AS day_sales,
              COUNT(DISTINCT o.order_id) AS day_orders
            FROM orders o
            WHERE o.created_at >= ${startDate}
              AND o.created_at <= ${endDate}
              AND (${seller_id}::int IS NULL OR o.seller_id = ${seller_id})
            GROUP BY 1
          ) t
        `);

        totalDays = Number(totals[0]?.total_days || 0);
        total_sales = Number(totals[0]?.total_sales || 0);
        total_orders_count = Number(totals[0]?.total_orders || 0);
      }

      const average_daily_sales = totalDays > 0 ? total_sales / totalDays : 0;

      const response: SalesHistoryReportResponse = {
        sales: sales.map((r) => ({
          date: r.date,
          total_sales: Number(r.total_sales || 0),
          total_orders: Number(r.total_orders || 0),
          total_shifts: Number(r.total_shifts || 0),
        })),
        pagination: {
          page,
          limit,
          total: totalDays,
          totalPages: Math.ceil((totalDays || 0) / limit),
        },
        summary: { total_sales, total_orders: total_orders_count, average_daily_sales },
      };

      // Emit event
      eventBus.emit('reports.generated', {
        report_type: ReportType.SALES_HISTORY,
        filters: { start_date, end_date, seller_id, product_id, page, limit },
        generated_by: currentUserId,
        generated_at: new Date(),
      } satisfies ReportGeneratedEvent);

      return response;
    } catch (error: any) {
      logger.error('Error generating sales history report', {
        error: error.message,
        stack: error.stack,
        userId: currentUserId,
        start_date: request.start_date,
        end_date: request.end_date,
      });
      throw error;
    }
  }

  /**
   * Stock Report
   */
  static async getStockReport(request: StockReportRequest, currentUserId: number): Promise<StockReportResponse> {
    try {
      const { low_stock_only } = request;

      if (low_stock_only) {
        // Use raw query for efficient low stock filtering
        const rawItems = await prisma.$queryRaw`
              SELECT s.stock_id, s.product_id, s.quantity, s.updated_at,
                     p.product_name, p.product_code, p.category, p.low_stock_threshold, p.status as p_status
              FROM stocks s
              JOIN products p ON s.product_id = p.product_id
              WHERE p.status = 'active'
                AND p.low_stock_threshold IS NOT NULL
                AND s.quantity <= p.low_stock_threshold
          `;

        const stock_report = (rawItems as any[]).map(s => ({
          product_id: s.product_id,
          product_name: s.product_name,
          current_stock: s.quantity,
          low_stock_threshold: s.low_stock_threshold,
          status: (s.quantity <= 0 ? 'out_of_stock' : 'low_stock') as 'out_of_stock' | 'low_stock',
        }));

        const response = {
          summary: {
            total_products: stock_report.length,
            low_stock_count: stock_report.filter(i => i.status === 'low_stock').length,
            out_of_stock_count: stock_report.filter(i => i.status === 'out_of_stock').length,
          },
          stock_report
        };

        // Emit event
        eventBus.emit('reports.generated', {
          report_type: ReportType.STOCK_SUMMARY,
          filters: { low_stock_only },
          generated_by: currentUserId,
          generated_at: new Date(),
        } satisfies ReportGeneratedEvent);

        return response;
      }

      // Normal case (all stocks)
      const stocks = await prisma.stock.findMany({
        include: { product: true },
        where: { product: { status: 'active' } }
      });

      const stock_report = stocks.map(s => ({
        product_id: s.productId,
        product_name: s.product.productName,
        current_stock: s.quantity,
        low_stock_threshold: s.product.lowStockThreshold,
        status: (s.quantity <= 0 ? 'out_of_stock' : s.quantity <= (s.product.lowStockThreshold || 0) ? 'low_stock' : 'in_stock') as any,
      }));

      const response = {
        summary: {
          total_products: stocks.length,
          low_stock_count: stock_report.filter(i => i.status === 'low_stock').length,
          out_of_stock_count: stock_report.filter(i => i.status === 'out_of_stock').length,
        },
        stock_report
      };

      // Emit event
      eventBus.emit('reports.generated', {
        report_type: ReportType.STOCK_SUMMARY,
        filters: { low_stock_only },
        generated_by: currentUserId,
        generated_at: new Date(),
      } satisfies ReportGeneratedEvent);

      return response;
    } catch (error: any) {
      logger.error('Error generating stock report', {
        error: error.message,
        stack: error.stack,
        userId: currentUserId,
        low_stock_only: request.low_stock_only,
      });
      throw error;
    }
  }

  /**
   * Export Report (CSV/PDF)
   */
  static async exportReport(request: ExportReportRequest, currentUserId: number): Promise<ExportReportResponse> {
    const { report_type, filters, format } = request;
    let data: any[];
    let fileName: string;

    try {
      switch (report_type) {
        case ReportType.DAILY_SALES:
        case 'daily_sales': // Support both enum and string for backward compatibility
          const dailyFilters = filters as DailySalesReportRequest;
          const dailyReport = await this.getDailyReport(dailyFilters, currentUserId);
          // Transform daily report to flat structure for CSV
          data = this.transformDailyReportForExport(dailyReport);
          fileName = `daily_sales_${dailyFilters.date || Date.now()}`;
          break;
        case ReportType.SALES_HISTORY:
        case 'sales_history': // Support both enum and string for backward compatibility
          const salesFilters = filters as SalesHistoryReportRequest;
          const salesHistory = await this.getSalesHistoryReport(salesFilters, currentUserId);
          data = salesHistory.sales;
          fileName = `sales_history_${salesFilters.start_date}_${salesFilters.end_date}`;
          break;
        case ReportType.STOCK_SUMMARY:
        case 'stock':
        case 'stock_summary': // Support both enum and string for backward compatibility
          const stockFilters = filters as StockReportRequest;
          const stockReport = await this.getStockReport(stockFilters, currentUserId);
          data = stockReport.stock_report;
          fileName = `stock_report_${Date.now()}`;
          break;
        default:
          throw new ValidationException(`Invalid report type: ${report_type}`);
      }

      if (!data || data.length === 0) {
        throw new ValidationException('No data available to export');
      }

      // Normalize format to uppercase for comparison
      const normalizedFormat = format.toUpperCase();
      let file_name: string;
      let file_path: string;
      let fileExtension: string;

      // Determine file extension based on format
      if (normalizedFormat === ReportExportFormat.XLSX || normalizedFormat === 'XLSX') {
        fileExtension = '.xlsx';
      } else if (normalizedFormat === ReportExportFormat.PDF || normalizedFormat === 'PDF') {
        fileExtension = '.pdf';
      } else {
        fileExtension = '.csv';
      }

      // Generate file with appropriate extension (always CSV for now, but with correct extension)
      file_name = await ReportExportService.exportCSV(data, `${fileName}${fileExtension}`);
      file_path = `/tmp/${file_name}`;

      const response: ExportReportResponse = {
        file_name,
        file_path,
        generated_at: new Date(),
      };

      // Emit event
      eventBus.emit('reports.exported', {
        report_type: report_type === 'stock' ? ReportType.STOCK_SUMMARY : (report_type as 'daily_sales' | 'sales_history' | 'stock_summary'),
        file_name,
        file_path,
        exported_by: currentUserId,
        exported_at: new Date(),
      } satisfies ReportExportedEvent);

      return response;
    } catch (error: any) {
      logger.error('Export report error', {
        error: error.message,
        report_type,
        userId: currentUserId,
        stack: error.stack,
      });
      throw error;
    }
  }

  /**
   * Transform daily report to flat structure for CSV export
   */
  static transformDailyReportForExport(report: DailySalesReportResponse): any[] {
    const rows: any[] = [];

    // Add summary row
    rows.push({
      type: 'Summary',
      date: report.date,
      total_sales: report.summary.total_sales,
      total_orders: report.summary.total_orders,
      total_shifts: report.summary.total_shifts,
      average_order_value: report.summary.average_order_value,
    });

    // Add shift details
    report.shifts.forEach((shift, index) => {
      rows.push({
        type: `Shift ${index + 1}`,
        shift_id: shift.shift_id,
        seller_name: shift.seller_name,
        total_sales: shift.total_sales,
        total_orders: shift.total_orders,
      });
    });

    // Add top products
    report.top_products.forEach((product, index) => {
      rows.push({
        type: `Top Product ${index + 1}`,
        product_id: product.product_id,
        product_name: product.product_name,
        quantity_sold: product.quantity_sold,
        revenue: product.revenue,
      });
    });

    return rows;
  }
}
