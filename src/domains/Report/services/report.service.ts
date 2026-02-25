import prisma from '@src/database/client';
import {
  DailySalesReportRequest,
  DailySalesReportResponse,
  SalesHistoryReportRequest,
  SalesHistoryReportResponse,
  StockReportRequest,
  StockReportResponse,
  ExportReportRequest,
  ExportReportResponse,
  TopProduct,
  ShiftBreakdown,
  LowStockItem,
  DailyReportSummary,
  DailyReportMetadata,
  IncomeReportPeriod,
  IncomeReportResponse,
} from '../types/report.types';
import { ReportType } from '../enums/report-type.enum';
import { ReportExportFormat } from '../enums/export-format.enum';
import { ValidationException } from '@src/shared/exceptions';
import { logger } from '@src/shared/utils/logger';
import { ReportCacheService } from './report-cache.service';
import { ReportExportService } from './report-export.service';
import { eventBus } from '@src/shared/events/event-bus';
import { ReportGeneratedEvent } from '../events/report-generated.event';
import { ReportExportedEvent } from '../events/report-exported.event';
import { Prisma } from '@src/database/generated';
import { calculateProfit } from '@src/domains/Report/utils/income-math';

const DEFAULT_TIMEZONE = process.env.REPORT_TIMEZONE || 'Asia/Phnom_Penh';

export class ReportService {
  private static getNowParts(timeZone: string): {
    year: number;
    month: number;
    day: number;
    weekday: string;
  } {
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      weekday: 'short',
    });
    const parts = formatter.formatToParts(new Date());
    const lookup = (type: string) => parts.find((part) => part.type === type)?.value ?? '';
    return {
      year: Number(lookup('year')),
      month: Number(lookup('month')),
      day: Number(lookup('day')),
      weekday: lookup('weekday'),
    };
  }

  static resolvePeriodRange(period: IncomeReportPeriod): { start: Date; end: Date } {
    const nowParts = this.getNowParts(DEFAULT_TIMEZONE);
    const todayStr = `${nowParts.year}-${String(nowParts.month).padStart(2, '0')}-${String(
      nowParts.day
    ).padStart(2, '0')}`;

    const end = new Date(`${todayStr}T23:59:59.999+07:00`);

    if (period === 'daily') {
      return {
        start: new Date(`${todayStr}T00:00:00+07:00`),
        end,
      };
    }

    if (period === 'weekly') {
      const weekdayMap: Record<string, number> = {
        Mon: 1,
        Tue: 2,
        Wed: 3,
        Thu: 4,
        Fri: 5,
        Sat: 6,
        Sun: 7,
      };
      const weekdayIndex = weekdayMap[nowParts.weekday] ?? 1;
      const daysFromMonday = weekdayIndex - 1;
      const start = new Date(`${todayStr}T00:00:00+07:00`);
      start.setUTCDate(start.getUTCDate() - daysFromMonday);
      return { start, end };
    }

    if (period === 'monthly') {
      const start = new Date(
        `${nowParts.year}-${String(nowParts.month).padStart(2, '0')}-01T00:00:00+07:00`
      );
      return { start, end };
    }

    const start = new Date(`${nowParts.year}-01-01T00:00:00+07:00`);
    return { start, end };
  }

  /**
   * Income Report
   */
  static async getIncomeReport(period: IncomeReportPeriod, tenantId?: number): Promise<IncomeReportResponse> {
    const normalizedPeriod = (period || 'daily') as IncomeReportPeriod;
    const { start, end } = this.resolvePeriodRange(normalizedPeriod);
    const effectiveTenantId = tenantId ?? 1;

    const salesAgg = await prisma.order.aggregate({
      where: {
        orderDate: { gte: start, lte: end },
        tenantId: effectiveTenantId
      },
      _sum: { totalAmount: true },
      _count: { orderId: true },
    });

    const cogsAgg = await prisma.orderItem.aggregate({
      where: {
        order: {
          orderDate: { gte: start, lte: end },
          tenantId: effectiveTenantId
        }
      },
      _sum: { cogsLineTotal: true, quantity: true },
    });

    const purchasesRows = await prisma.$queryRaw<
      { total_cost: any; total_qty: any }[]
    >(Prisma.sql`
      SELECT
        COALESCE(SUM(COALESCE(sm.cost, 0) * COALESCE(sm.quantity, 0)), 0) AS total_cost,
        COALESCE(SUM(COALESCE(sm.quantity, 0)), 0) AS total_qty
      FROM stock_movements sm
      JOIN users u ON u.user_id = sm.created_by
      WHERE sm.movement_type = 'STOCK_IN'
        AND sm.created_at >= ${start}
        AND sm.created_at <= ${end}
        AND u.tenant_id = ${effectiveTenantId}
    `);

    const totalSales = Number(salesAgg._sum.totalAmount || 0);
    const totalOrders = Number(salesAgg._count.orderId || 0);
    const totalItems = Number(cogsAgg._sum?.quantity || 0);
    const cogs = Number(cogsAgg._sum?.cogsLineTotal || 0);
    const purchasesCost = Number(purchasesRows[0]?.total_cost || 0);
    const purchasesQty = Number(purchasesRows[0]?.total_qty || 0);
    const profit = calculateProfit(totalSales, cogs);

    return {
      total_sales: totalSales,
      total_orders: totalOrders,
      totalItems,
      cogs,
      profit,
      purchasesCost,
      purchasesQty,
    };
  }

  /**
   * Daily Sales Report
   */
  static async getDailyReport(
    request: DailySalesReportRequest,
    currentUserId: number,
    currentUserRole: string,
    tenantId?: number
  ): Promise<DailySalesReportResponse> {
    try {
      const { date, seller_id } = request;
      const effectiveTenantId = tenantId ?? 1;

      // Validate date format
      if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        throw new ValidationException('Invalid date format. Expected YYYY-MM-DD');
      }

      const effectiveSellerId =
        currentUserRole === 'ADMIN' ? (seller_id ?? null) : currentUserId;

      // Cache check
      const cacheKey = `tenant:${effectiveTenantId}:daily_report:${date}:${effectiveSellerId || 'all'}`;
      if (!request.bypass_cache) {
        const cached = await ReportCacheService.getCached(cacheKey);
        if (cached) return cached;
      }

      // 1. Calculate the UTC range for the given day in Phnom Penh time
      // The day is "date" (YYYY-MM-DD) in Asia/Phnom_Penh.
      // 2026-02-10 in PP starts at 2026-02-10 00:00:00+07:00, which is 2026-02-09 17:00:00Z
      // 2026-02-10 in PP ends at 2026-02-10 23:59:59+07:00, which is 2026-02-10 16:59:59Z

      const startOfDay = new Date(`${date}T00:00:00+07:00`);
      const endOfDay = new Date(`${date}T23:59:59.999+07:00`);

      // Validate date is valid
      if (isNaN(startOfDay.getTime()) || isNaN(endOfDay.getTime())) {
        throw new ValidationException('Invalid date provided');
      }

      const whereClause: Prisma.OrderWhereInput = {
        orderDate: {
          gte: startOfDay,
          lte: endOfDay,
        },
        tenantId: effectiveTenantId,
      };
      if (effectiveSellerId) {
        whereClause.sellerId = effectiveSellerId;
      }

      type ShiftRow = {
        seller_id: number;
        seller_name: string;
        shift_count: number | string;
        total_sales: Prisma.Decimal | number | string;
        total_orders: number | string;
        start_time: Date | null;
        end_time: Date | null;
      };

      type LowStockRow = {
        product_id: number;
        product_name: string;
        product_code: string;
        current_stock: number;
        low_stock_threshold: number | null;
        updated_at: Date;
      };

      // 2. Execute independent queries in parallel
      const [
        aggregations,
        shiftRows,
        topProductsRaw,
        lowStockRows,
        totalProductsSold,
        uniqueProductsSoldResult,
        activeProductsCount
      ] = await Promise.all([
        // Summary aggregations
        prisma.order.aggregate({
          where: whereClause,
          _sum: {
            totalAmount: true,
          },
          _count: {
            orderId: true,
          },
        }),

        // Shifts breakdown
        prisma.$queryRaw<ShiftRow[]>(Prisma.sql`
          SELECT
            s.seller_id,
            u.full_name AS seller_name,
            COUNT(DISTINCT s.shift_id) AS shift_count,
            COALESCE(SUM(o.total_amount), 0) AS total_sales,
            COUNT(DISTINCT o.order_id) AS total_orders,
            MIN(s.start_time) AS start_time,
            MAX(s.end_time) AS end_time
          FROM shifts s
          JOIN users u ON u.user_id = s.seller_id
          LEFT JOIN orders o
            ON o.shift_id = s.shift_id
            AND o.order_date >= ${startOfDay}
            AND o.order_date <= ${endOfDay}
          WHERE s.shift_date >= ${startOfDay}::date
            AND s.shift_date <= ${endOfDay}::date
            AND u.tenant_id = ${effectiveTenantId}
            AND (${effectiveSellerId}::int IS NULL OR s.seller_id = ${effectiveSellerId})
          GROUP BY s.seller_id, u.full_name
        `),

        // Top products consolidated
        prisma.$queryRaw<any[]>(Prisma.sql`
          SELECT
            oi.product_id,
            p.product_name,
            p.product_code,
            SUM(oi.quantity) AS quantity_sold,
            SUM(oi.subtotal) AS revenue,
            MIN(p.price) as product_price
          FROM order_items oi
          JOIN orders o ON o.order_id = oi.order_id
          JOIN products p ON p.product_id = oi.product_id
          WHERE o.order_date >= ${startOfDay}
            AND o.order_date <= ${endOfDay}
            AND o.tenant_id = ${effectiveTenantId}
            AND (${effectiveSellerId}::int IS NULL OR o.seller_id = ${effectiveSellerId})
          GROUP BY oi.product_id, p.product_name, p.product_code
          ORDER BY revenue DESC
          LIMIT 5
        `),

        // Low stock items
        prisma.$queryRaw<LowStockRow[]>(Prisma.sql`
          SELECT
            s.product_id,
            p.product_name,
            p.product_code,
            s.quantity AS current_stock,
            p.low_stock_threshold,
            s.updated_at
          FROM stocks s
          JOIN products p ON p.product_id = s.product_id
          JOIN users u ON u.user_id = p.created_by
          WHERE p.status = 'active'
            AND u.tenant_id = ${effectiveTenantId}
            AND (
              s.quantity < 0
              OR (p.low_stock_threshold IS NOT NULL AND s.quantity <= p.low_stock_threshold)
            )
          ORDER BY s.quantity ASC
          LIMIT 10
        `),

        // Total products sold
        prisma.orderItem.aggregate({
          where: {
            order: {
              orderDate: {
                gte: startOfDay,
                lte: endOfDay,
              },
              tenantId: effectiveTenantId,
              ...(effectiveSellerId ? { sellerId: effectiveSellerId } : {}),
            },
          },
          _sum: {
            quantity: true,
          },
        }),

        // Unique products sold
        prisma.$queryRaw<{ unique_products_sold: number | string }[]>(Prisma.sql`
          SELECT COUNT(DISTINCT oi.product_id) AS unique_products_sold
          FROM order_items oi
          JOIN orders o ON o.order_id = oi.order_id
          WHERE o.order_date >= ${startOfDay}
            AND o.order_date <= ${endOfDay}
            AND o.tenant_id = ${effectiveTenantId}
            AND (${effectiveSellerId}::int IS NULL OR o.seller_id = ${effectiveSellerId})
        `),

        // Active products count
        prisma.product.count({
          where: {
            status: 'active',
            createdByUser: {
              tenantId: effectiveTenantId,
            },
          },
        }),
      ]);

      const total_sales = Number(aggregations._sum.totalAmount || 0);
      const total_orders = aggregations._count.orderId;
      const average_order_value = total_orders > 0 ? total_sales / total_orders : 0;
      const unique_products_sold = uniqueProductsSoldResult[0]?.unique_products_sold;
      const total_products = Number(activeProductsCount || 0);

      let shifts_breakdown: ShiftBreakdown[] = shiftRows.map(row => ({
        seller_id: row.seller_id,
        seller_name: row.seller_name || 'Unknown',
        shift_count: Number(row.shift_count || 0),
        total_sales: Number(row.total_sales || 0),
        total_orders: Number(row.total_orders || 0),
        start_time: row.start_time ? new Date(row.start_time).toISOString() : null,
        end_time: row.end_time ? new Date(row.end_time).toISOString() : null,
      }));

      const top_products: TopProduct[] = topProductsRaw.map((p: any) => {
        const quantitySold = Number(p.quantity_sold || 0);
        const revenue = Number(p.revenue || 0);
        const averagePrice = quantitySold > 0 ? revenue / quantitySold : Number(p.product_price || 0);

        return {
          product_id: p.product_id,
          product_name: p.product_name || 'Unknown Product',
          product_code: p.product_code || 'N/A',
          quantity_sold: quantitySold,
          revenue,
          average_price: Number(averagePrice.toFixed(2)),
        };
      });

      const low_stock_items: LowStockItem[] = lowStockRows.map(row => ({
        product_id: row.product_id,
        product_name: row.product_name || 'Unknown Product',
        product_code: row.product_code || 'N/A',
        current_stock: row.current_stock,
        low_stock_threshold: row.low_stock_threshold || 0,
        status: row.current_stock <= 0 ? 'out_of_stock' : 'low_stock',
        last_updated: row.updated_at.toISOString(),
      }));

      const averageItemsPerOrder = total_orders > 0 ? (totalProductsSold._sum.quantity || 0) / total_orders : 0;

      // Find peak sales hour (simplified - just use a default for now)
      const peakSalesHour = '18:00-19:00';

      // Calculate cash collected (simplified - assume all sales are cash for now)
      const cashCollected = total_sales;

      // Calculate short/over amount (simplified - assume no discrepancies for now)
      const shortOverAmount = 0;

      const summary: DailyReportSummary = {
        total_products_sold: totalProductsSold._sum.quantity || 0,
        unique_products_sold: Number(unique_products_sold || 0),
        total_products: total_products,
        average_items_per_order: Number(averageItemsPerOrder.toFixed(2)),
        peak_sales_hour: peakSalesHour,
        cash_collected: cashCollected,
        short_over_amount: shortOverAmount,
      };

      const metadata: DailyReportMetadata = {
        generated_at: new Date().toISOString(),
        data_freshness: 'real-time',
        includes_all_shifts: !effectiveSellerId,
        report_period: `${startOfDay.toISOString()} to ${endOfDay.toISOString()}`,
      };

      const report: DailySalesReportResponse = {
        date,
        total_sales,
        total_orders,
        total_shifts: shifts_breakdown.reduce((sum, shift) => sum + shift.shift_count, 0),
        average_order_value: Number(average_order_value.toFixed(2)),
        currency: 'USD',
        shifts_breakdown,
        top_products,
        low_stock_items,
        summary,
        metadata,
      };

      // Cache result for 10 minutes
      await ReportCacheService.setCached(cacheKey, report, 600);

      // Emit event
      eventBus.emit('reports.generated', {
        report_type: ReportType.DAILY_SALES,
        filters: { date, seller_id: effectiveSellerId },
        generated_by: currentUserId,
        generated_at: new Date(),
      } satisfies ReportGeneratedEvent);

      return report;
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      logger.error('Error generating daily report', {
        error: err.message,
        stack: err.stack,
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
  static async getSalesHistoryReport(
    request: SalesHistoryReportRequest,
    currentUserId: number,
    currentUserRole: string,
    tenantId?: number
  ): Promise<SalesHistoryReportResponse> {
    try {
      const { start_date, end_date, seller_id, product_id, page = 1, limit = 50 } = request;
      const effectiveTenantId = tenantId ?? 1;
      const effectiveSellerId =
        currentUserRole === 'ADMIN' ? (seller_id ?? null) : currentUserId;

      // Validate date formats
      if (!start_date || !/^\d{4}-\d{2}-\d{2}$/.test(start_date)) {
        throw new ValidationException('Invalid start_date format. Expected YYYY-MM-DD');
      }
      if (!end_date || !/^\d{4}-\d{2}-\d{2}$/.test(end_date)) {
        throw new ValidationException('Invalid end_date format. Expected YYYY-MM-DD');
      }

      // Validate date range
      const startDate = new Date(`${start_date}T00:00:00+07:00`);
      const endDate = new Date(`${end_date}T23:59:59+07:00`);
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

      type SalesRow = {
        date: string;
        total_sales: Prisma.Decimal | number | string;
        total_orders: number | string;
        total_shifts: number | string;
      };

      let sales: SalesRow[] = [];
      let totalDays = 0;
      let total_sales = 0;
      let total_orders_count = 0;

      if (product_id) {
        sales = await prisma.$queryRaw<SalesRow[]>(Prisma.sql`
          SELECT
            to_char(date_trunc('day', o.created_at AT TIME ZONE 'Asia/Phnom_Penh'), 'YYYY-MM-DD') AS date,
            COALESCE(SUM(oi.subtotal), 0) AS total_sales,
            COUNT(DISTINCT o.order_id) AS total_orders,
            COUNT(DISTINCT o.shift_id) AS total_shifts
          FROM orders o
          JOIN order_items oi ON oi.order_id = o.order_id
          WHERE o.created_at >= ${startDate}
            AND o.created_at <= ${endDate}
            AND oi.product_id = ${product_id}
            AND o.tenant_id = ${effectiveTenantId}
            AND (${effectiveSellerId}::int IS NULL OR o.seller_id = ${effectiveSellerId})
          GROUP BY 1
          ORDER BY 1 DESC
          OFFSET ${offset} LIMIT ${limit}
        `);

        const totals = await prisma.$queryRaw<{ total_days: number | string; total_sales: Prisma.Decimal | number | string; total_orders: number | string }[]>(Prisma.sql`
          SELECT
            COUNT(*) AS total_days,
            COALESCE(SUM(day_sales), 0) AS total_sales,
            COALESCE(SUM(day_orders), 0) AS total_orders
          FROM (
            SELECT
              date_trunc('day', o.created_at AT TIME ZONE 'Asia/Phnom_Penh') AS day,
              COALESCE(SUM(oi.subtotal), 0) AS day_sales,
              COUNT(DISTINCT o.order_id) AS day_orders
            FROM orders o
            JOIN order_items oi ON oi.order_id = o.order_id
            WHERE o.created_at >= ${startDate}
              AND o.created_at <= ${endDate}
              AND oi.product_id = ${product_id}
              AND o.tenant_id = ${effectiveTenantId}
            AND (${effectiveSellerId}::int IS NULL OR o.seller_id = ${effectiveSellerId})
            GROUP BY 1
          ) t
        `);

        totalDays = Number(totals[0]?.total_days || 0);
        total_sales = Number(totals[0]?.total_sales || 0);
        total_orders_count = Number(totals[0]?.total_orders || 0);
      } else {
        sales = await prisma.$queryRaw<SalesRow[]>(Prisma.sql`
          SELECT
            to_char(date_trunc('day', o.created_at AT TIME ZONE 'Asia/Phnom_Penh'), 'YYYY-MM-DD') AS date,
            COALESCE(SUM(o.total_amount), 0) AS total_sales,
            COUNT(DISTINCT o.order_id) AS total_orders,
            COUNT(DISTINCT o.shift_id) AS total_shifts
          FROM orders o
          WHERE o.created_at >= ${startDate}
            AND o.created_at <= ${endDate}
            AND o.tenant_id = ${effectiveTenantId}
            AND (${effectiveSellerId}::int IS NULL OR o.seller_id = ${effectiveSellerId})
          GROUP BY 1
          ORDER BY 1 DESC
          OFFSET ${offset} LIMIT ${limit}
        `);

        const totals = await prisma.$queryRaw<{ total_days: number | string; total_sales: Prisma.Decimal | number | string; total_orders: number | string }[]>(Prisma.sql`
          SELECT
            COUNT(*) AS total_days,
            COALESCE(SUM(day_sales), 0) AS total_sales,
            COALESCE(SUM(day_orders), 0) AS total_orders
          FROM (
            SELECT
              date_trunc('day', o.created_at AT TIME ZONE 'Asia/Phnom_Penh') AS day,
              COALESCE(SUM(o.total_amount), 0) AS day_sales,
              COUNT(DISTINCT o.order_id) AS day_orders
            FROM orders o
            WHERE o.created_at >= ${startDate}
              AND o.created_at <= ${endDate}
              AND o.tenant_id = ${effectiveTenantId}
            AND (${effectiveSellerId}::int IS NULL OR o.seller_id = ${effectiveSellerId})
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
          // total is the count of distinct days with data (not total days in the requested range)
          total: totalDays,
          totalPages: Math.ceil((totalDays || 0) / limit),
        },
        summary: { total_sales, total_orders: total_orders_count, average_daily_sales },
      };

      // Emit event
      eventBus.emit('reports.generated', {
        report_type: ReportType.SALES_HISTORY,
        filters: { start_date, end_date, seller_id: effectiveSellerId, product_id, page, limit },
        generated_by: currentUserId,
        generated_at: new Date(),
      } satisfies ReportGeneratedEvent);

      return response;
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      logger.error('Error generating sales history report', {
        error: err.message,
        stack: err.stack,
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
  static async getStockReport(request: StockReportRequest, currentUserId: number, tenantId?: number): Promise<StockReportResponse> {
    try {
      const { low_stock_only, start_date, end_date } = request;
      const effectiveTenantId = tenantId ?? 1;
      let rangeStart: Date | null = null;
      let rangeEnd: Date | null = null;
      if (start_date && end_date) {
        const start = new Date(`${start_date}T00:00:00+07:00`);
        const end = new Date(`${end_date}T23:59:59.999+07:00`);
        if (!isNaN(start.getTime()) && !isNaN(end.getTime())) {
          rangeStart = start;
          rangeEnd = end;
        }
      }

      if (low_stock_only) {
        // Use raw query for efficient low stock filtering
        type StockRawRow = {
          stock_id: number;
          product_id: number;
          quantity: number;
          updated_at: Date;
          product_name: string;
          product_code: string;
          image_path: string | null;
          category: string | null;
          low_stock_threshold: number | null;
          p_status: string;
        };

        const rawItems = await prisma.$queryRaw<StockRawRow[]>`
              SELECT s.stock_id, s.product_id, s.quantity, s.updated_at,
                     p.product_name, p.product_code, p.image_path, p.category, p.low_stock_threshold, p.status as p_status
              FROM stocks s
              JOIN products p ON s.product_id = p.product_id
              JOIN users u ON u.user_id = p.created_by
              WHERE p.status = 'active'
                AND u.tenant_id = ${effectiveTenantId}
                ${rangeStart && rangeEnd ? Prisma.sql`AND s.updated_at >= ${rangeStart} AND s.updated_at <= ${rangeEnd}` : Prisma.empty}
                AND (
                  s.quantity < 0
                  OR (p.low_stock_threshold IS NOT NULL AND s.quantity <= p.low_stock_threshold)
                )
          `;

        const stock_report = rawItems.map(s => ({
          product_id: s.product_id,
          product_name: s.product_name,
          product_code: s.product_code,
          image_path: s.image_path,
          category: s.category,
          current_stock: s.quantity,
          low_stock_threshold: s.low_stock_threshold,
          status: (s.quantity < 0
            ? 'negative'
            : s.quantity === 0
              ? 'out_of_stock'
              : 'low_stock') as 'negative' | 'out_of_stock' | 'low_stock',
        }));

        const [{ total_active_products }] = await prisma.$queryRaw<{ total_active_products: number }[]>`
              SELECT COUNT(*)::int AS total_active_products
              FROM products p
              JOIN users u ON u.user_id = p.created_by
              WHERE p.status = 'active'
                AND u.tenant_id = ${effectiveTenantId}
          `;

        const response = {
          summary: {
            total_products: total_active_products || 0,
            low_stock_count: stock_report.filter(i => i.status === 'low_stock').length,
            out_of_stock_count: stock_report.filter(i => i.status === 'out_of_stock').length,
            negative_stock_count: stock_report.filter(i => i.status === 'negative').length,
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
        where: {
          product: {
            status: 'active',
            createdByUser: { tenantId: effectiveTenantId }
          },
          ...(rangeStart && rangeEnd ? { updatedAt: { gte: rangeStart, lte: rangeEnd } } : {}),
        },
      });

      const stock_report = stocks.map(s => ({
        product_id: s.productId,
        product_name: s.product.productName,
        product_code: s.product.productCode,
        image_path: s.product.imagePath ?? null,
        category: s.product.category,
        current_stock: s.quantity,
        low_stock_threshold: s.product.lowStockThreshold,
        status: (s.quantity < 0
          ? 'negative'
          : s.quantity === 0
            ? 'out_of_stock'
            : s.quantity <= (s.product.lowStockThreshold || 0)
              ? 'low_stock'
              : 'in_stock') as 'negative' | 'out_of_stock' | 'low_stock' | 'in_stock',
      }));

      const response = {
        summary: {
          total_products: stocks.length,
          low_stock_count: stock_report.filter(i => i.status === 'low_stock').length,
          out_of_stock_count: stock_report.filter(i => i.status === 'out_of_stock').length,
          negative_stock_count: stock_report.filter(i => i.status === 'negative').length,
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
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      logger.error('Error generating stock report', {
        error: err.message,
        stack: err.stack,
        userId: currentUserId,
        low_stock_only: request.low_stock_only,
      });
      throw error;
    }
  }

  /**
   * Export Report (CSV/PDF)
   */
  static async exportReport(
    request: ExportReportRequest,
    currentUserId: number,
    currentUserRole: string,
    tenantId?: number
  ): Promise<ExportReportResponse> {
    const { report_type, filters, format } = request;
    const effectiveTenantId = tenantId ?? 1;
    let data: unknown[];
    let fileName: string;

    try {
      switch (report_type) {
        case ReportType.DAILY_SALES:
        case 'daily_sales': // Support both enum and string for backward compatibility
          const dailyFilters = filters as DailySalesReportRequest;
          const dailyReport = await this.getDailyReport(
            dailyFilters,
            currentUserId,
            currentUserRole,
            effectiveTenantId
          );
          // Transform daily report to flat structure for CSV
          data = this.transformDailyReportForExport(dailyReport);
          fileName = `daily_sales_${dailyFilters.date || Date.now()}`;
          break;
        case ReportType.SALES_HISTORY:
        case 'sales_history': // Support both enum and string for backward compatibility
          const salesFilters = filters as SalesHistoryReportRequest;
          const salesHistory = await this.getSalesHistoryReport(
            salesFilters,
            currentUserId,
            currentUserRole
          );
          data = salesHistory.sales;
          fileName = `sales_history_${salesFilters.start_date}_${salesFilters.end_date}`;
          break;
        case ReportType.STOCK_SUMMARY:
        case 'stock':
        case 'stock_summary': // Support both enum and string for backward compatibility
          const stockFilters = filters as StockReportRequest;
          const stockReport = await this.getStockReport(stockFilters, currentUserId, effectiveTenantId);
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
      const file_name = await ReportExportService.exportCSV(data, `${fileName}${fileExtension}`);
      const file_path = `/tmp/${file_name}`;

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
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      logger.error('Export report error', {
        error: err.message,
        report_type,
        userId: currentUserId,
        stack: err.stack,
      });
      throw error;
    }
  }

  /**
   * Transform daily report to flat structure for CSV export
   */
  static transformDailyReportForExport(report: DailySalesReportResponse): Record<string, unknown>[] {
    const rows: Record<string, unknown>[] = [];

    // Add summary row
    rows.push({
      type: 'Summary',
      date: report.date,
      total_sales: report.total_sales,
      total_orders: report.total_orders,
      total_shifts: report.total_shifts,
      average_order_value: report.average_order_value,
      currency: report.currency,
    });

    // Add shift details
    report.shifts_breakdown.forEach((shift, index) => {
      rows.push({
        type: `Shift ${index + 1}`,
        seller_id: shift.seller_id,
        seller_name: shift.seller_name,
        shift_count: shift.shift_count,
        total_sales: shift.total_sales,
        total_orders: shift.total_orders,
        start_time: shift.start_time,
        end_time: shift.end_time,
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
        average_price: product.average_price,
      });
    });

    // Add low stock items
    report.low_stock_items.forEach((item, index) => {
      rows.push({
        type: `Low Stock ${index + 1}`,
        product_id: item.product_id,
        product_name: item.product_name,
        product_code: item.product_code,
        current_stock: item.current_stock,
        low_stock_threshold: item.low_stock_threshold,
        status: item.status,
        last_updated: item.last_updated,
      });
    });

    // Add summary data
    rows.push({
      type: 'Report Summary',
      total_products_sold: report.summary.total_products_sold,
      unique_products_sold: report.summary.unique_products_sold,
      average_items_per_order: report.summary.average_items_per_order,
      peak_sales_hour: report.summary.peak_sales_hour,
      cash_collected: report.summary.cash_collected,
      short_over_amount: report.summary.short_over_amount,
    });

    return rows;
  }
}
