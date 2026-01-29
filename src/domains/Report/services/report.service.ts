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
        seller_id: s.sellerId,
        total_sales: shiftTotal,
        total_orders: shiftOrders,
        average_order_value: shiftOrders > 0 ? shiftTotal / shiftOrders : 0
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
      product_code: 'N/A', // Not directly available in GroupBy without join, we can fetch if strictly needed or ignore
      quantity_sold: p._sum.quantity || 0,
      revenue: Number(p._sum.subtotal || 0),
    }));

    // Fetch product codes if needed (optional optimization: fetch all top product details in one query)
    if (top_products.length > 0) {
      const productIds = top_products.map(p => p.product_id);
      const productDetails = await prisma.product.findMany({
        where: { productId: { in: productIds } },
        select: { productId: true, productCode: true }
      });
      const codeMap = new Map(productDetails.map(p => [p.productId, p.productCode]));
      top_products.forEach(p => {
        p.product_code = codeMap.get(p.product_id) || 'N/A';
      });
    }


    // Low stock items
    // Efficient DB query using raw SQL to compare columns
    const lowStockRaw = await prisma.$queryRaw`
        SELECT p.product_id, p.product_name, p.product_code, s.quantity, p.low_stock_threshold
        FROM products p
        JOIN stocks s ON p.product_id = s.product_id
        WHERE p.status = 'active'
          AND p.low_stock_threshold IS NOT NULL
          AND s.quantity <= p.low_stock_threshold
    `;

    const low_stock_items: LowStockItem[] = (lowStockRaw as any[]).map(r => ({
      product_id: r.product_id,
      product_name: r.product_name,
      product_code: r.product_code,
      quantity: r.quantity,
      low_stock_threshold: r.low_stock_threshold,
    }));

    const report: DailySalesReportResponse = {
      date,
      total_sales,
      total_orders,
      average_order_value,
      shifts,
      top_products,
      low_stock_items,
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

    const whereClause: any = {
      createdAt: {
        gte: new Date(`${start_date}T00:00:00Z`),
        lte: new Date(`${end_date}T23:59:59Z`),
      },
    };
    if (seller_id) whereClause.sellerId = seller_id;
    if (product_id) whereClause.orderItems = { some: { productId: product_id } };

    const totalOrders = await prisma.order.count({ where: whereClause });

    const orders = await prisma.order.findMany({
      where: whereClause,
      include: {
        orderItems: {
          include: { product: true }
        }
      },
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { createdAt: 'desc' },
    });

    const items = orders.flatMap(o =>
      o.orderItems.map(item => ({
        order_id: o.orderId,
        product_id: item.productId,
        product_name: item.productName, // Available in OrderItem
        product_code: item.product.productCode, // Need relation
        seller_id: o.sellerId,
        quantity: item.quantity,
        price: Number(item.unitPrice), // property is unitPrice
        total_amount: Number(item.subtotal), // property is subtotal
        created_at: o.createdAt,
        shift_id: o.shiftId,
      }))
    );

    // Filter items by product_id if specified (as the order level filter includes the whole order)
    const filteredItems = product_id ? items.filter(i => i.product_id === product_id) : items;

    // Calculate aggregations for summary
    const aggregations = await prisma.order.aggregate({
      where: whereClause,
      _sum: { totalAmount: true },
      _count: { orderId: true }
    });

    const total_sales = Number(aggregations._sum.totalAmount || 0);
    const total_orders_count = aggregations._count.orderId; // Renamed to avoid variables conflict
    const total_days = Math.max(1, (new Date(end_date).getTime() - new Date(start_date).getTime()) / (1000 * 60 * 60 * 24));
    const average_daily_sales = total_sales / total_days;

      const response = {
        items: filteredItems,
        summary: { total_sales, total_orders: total_orders_count, average_daily_sales },
        pagination: { page, limit, total: totalOrders, totalPages: Math.ceil(totalOrders / limit) },
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

        const items = (rawItems as any[]).map(s => ({
          product_id: s.product_id,
          product_name: s.product_name,
          product_code: s.product_code,
          category: s.category,
          quantity: s.quantity,
          low_stock_threshold: s.low_stock_threshold,
          status: (s.quantity <= 0 ? 'out_of_stock' : 'low_stock') as 'out_of_stock' | 'low_stock',
          updated_at: s.updated_at,
        }));

        const response = {
          summary: {
            total_products: items.length,
            low_stock_count: items.filter(i => i.status === 'low_stock').length,
            out_of_stock_count: items.filter(i => i.status === 'out_of_stock').length,
          },
          items
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

      const items = stocks.map(s => ({
        product_id: s.productId,
        product_name: s.product.productName,
        product_code: s.product.productCode,
        category: s.product.category,
        quantity: s.quantity,
        low_stock_threshold: s.product.lowStockThreshold,
        status: (s.quantity <= 0 ? 'out_of_stock' : s.quantity <= (s.product.lowStockThreshold || 0) ? 'low_stock' : 'in_stock') as any,
        updated_at: s.updatedAt,
      }));

      const response = {
        summary: {
          total_products: stocks.length,
          low_stock_count: items.filter(i => i.status === 'low_stock').length,
          out_of_stock_count: items.filter(i => i.status === 'out_of_stock').length,
        },
        items
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
          data = salesHistory.items;
          fileName = `sales_history_${salesFilters.start_date}_${salesFilters.end_date}`;
          break;
        case ReportType.STOCK_SUMMARY:
        case 'stock':
        case 'stock_summary': // Support both enum and string for backward compatibility
          const stockFilters = filters as StockReportRequest;
          const stockReport = await this.getStockReport(stockFilters, currentUserId);
          data = stockReport.items;
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

      if (normalizedFormat === ReportExportFormat.PDF || normalizedFormat === 'PDF') {
        // PDF export not yet implemented, fallback to CSV
        logger.warn('PDF export requested but not implemented, falling back to CSV', {
          report_type,
          userId: currentUserId,
        });
        file_name = await ReportExportService.exportCSV(data, `${fileName}.csv`);
        file_path = `/tmp/${file_name}`;
      } else {
        file_name = await ReportExportService.exportCSV(data, `${fileName}.csv`);
        file_path = `/tmp/${file_name}`;
      }

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
  private static transformDailyReportForExport(report: DailySalesReportResponse): any[] {
    const rows: any[] = [];

    // Add summary row
    rows.push({
      type: 'Summary',
      date: report.date,
      total_sales: report.total_sales,
      total_orders: report.total_orders,
      average_order_value: report.average_order_value,
    });

    // Add shift details
    report.shifts.forEach((shift, index) => {
      rows.push({
        type: `Shift ${index + 1}`,
        shift_id: shift.shift_id,
        seller_id: shift.seller_id,
        total_sales: shift.total_sales,
        total_orders: shift.total_orders,
        average_order_value: shift.average_order_value,
      });
    });

    // Add top products
    report.top_products.forEach((product, index) => {
      rows.push({
        type: `Top Product ${index + 1}`,
        product_id: product.product_id,
        product_name: product.product_name,
        product_code: product.product_code,
        quantity_sold: product.quantity_sold,
        revenue: product.revenue,
      });
    });

    // Add low stock items
    report.low_stock_items.forEach((item, index) => {
      rows.push({
        type: `Low Stock ${index + 1}`,
        product_id: item.product_id,
        product_name: item.product_name,
        product_code: item.product_code,
        quantity: item.quantity,
        low_stock_threshold: item.low_stock_threshold,
      });
    });

    return rows;
  }
}
