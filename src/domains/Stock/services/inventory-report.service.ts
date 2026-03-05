import prisma from '@src/database/client';
import { Prisma } from '@src/database/generated';
import { ReportService } from '@src/domains/Report/services/report.service';
import { logger } from '@src/shared/utils/logger';
import type { StockReportResponse } from '@src/domains/Report/types/report.types';

export interface StockOnHandItem {
  product_id: number;
  product_name: string;
  product_code: string | null;
  quantity: number;
}

export interface StockOnHandReport {
  summary: {
    total_skus: number;
    total_qty: number;
  };
  items: StockOnHandItem[];
}

export interface InventoryValueItem {
  product_id: number;
  product_name: string;
  product_code: string | null;
  quantity: number;
  cost_per_unit: Prisma.Decimal;
  total_value: Prisma.Decimal;
}

export interface InventoryValueReport {
  summary: {
    total_skus: number;
    total_qty: number;
    total_value: Prisma.Decimal;
  };
  items: InventoryValueItem[];
}

export interface ReorderAlertItem {
  product_id: number;
  product_name: string;
  product_code: string | null;
  quantity: number;
  reorder_point: number;
}

export interface ReorderAlertReport {
  items: ReorderAlertItem[];
}

export class InventoryReportService {
  private static toDecimal(value: unknown) {
    return new Prisma.Decimal((value as any) ?? 0);
  }

  static async getStockOnHand(tenantId: number, limit = 10): Promise<StockOnHandReport> {
    const summaryRows = await prisma.$queryRaw<
      { total_skus: number; total_qty: number }[]
    >`
      SELECT
        COUNT(DISTINCT s.product_id)::int AS total_skus,
        COALESCE(SUM(s.quantity), 0)::int AS total_qty
      FROM stocks s
      JOIN products p ON p.product_id = s.product_id
      JOIN users u ON u.user_id = p.created_by
      WHERE p.status = 'active'
        AND u.tenant_id = ${tenantId}
    `;

    const items = await prisma.$queryRaw<
      { product_id: number; product_name: string; product_code: string | null; quantity: number }[]
    >`
      SELECT s.product_id, s.quantity, p.product_name, p.product_code
      FROM stocks s
      JOIN products p ON p.product_id = s.product_id
      JOIN users u ON u.user_id = p.created_by
      WHERE p.status = 'active'
        AND u.tenant_id = ${tenantId}
      ORDER BY s.quantity DESC
      LIMIT ${limit}
    `;

    const summary = summaryRows[0] ?? { total_skus: 0, total_qty: 0 };

    return {
      summary: {
        total_skus: Number(summary.total_skus || 0),
        total_qty: Number(summary.total_qty || 0),
      },
      items: items.map((item) => ({
        product_id: item.product_id,
        product_name: item.product_name,
        product_code: item.product_code,
        quantity: Number(item.quantity || 0),
      })),
    };
  }

  static async getInventoryValue(tenantId: number, limit = 10): Promise<InventoryValueReport> {
    // FIFO inventory valuation: sum cost from actual stock lots (qty_on_hand × lot cost)
    // This reflects the true FIFO carrying value of remaining inventory.
    const summaryRows = await prisma.$queryRaw<
      { total_skus: number; total_qty: number; total_value: any }[]
    >`
      SELECT
        COUNT(DISTINCT sl.product_id)::int AS total_skus,
        COALESCE(SUM(sl.qty_on_hand), 0)::int AS total_qty,
        COALESCE(SUM(sl.qty_on_hand * COALESCE(sl.cost, 0)), 0) AS total_value
      FROM stock_lots sl
      JOIN products p ON p.product_id = sl.product_id
      JOIN users u ON u.user_id = p.created_by
      WHERE p.status = 'active'
        AND u.tenant_id = ${tenantId}
        AND sl.qty_on_hand > 0
    `;

    const items = await prisma.$queryRaw<
      {
        product_id: number;
        product_name: string;
        product_code: string | null;
        quantity: number;
        fifo_cost: any;
        total_value: any;
      }[]
    >`
      SELECT
        p.product_id,
        p.product_name,
        p.product_code,
        COALESCE(SUM(sl.qty_on_hand), 0)::int AS quantity,
        CASE
          WHEN COALESCE(SUM(sl.qty_on_hand), 0) > 0
          THEN COALESCE(SUM(sl.qty_on_hand * COALESCE(sl.cost, 0)), 0) / SUM(sl.qty_on_hand)
          ELSE 0
        END AS fifo_cost,
        COALESCE(SUM(sl.qty_on_hand * COALESCE(sl.cost, 0)), 0) AS total_value
      FROM stock_lots sl
      JOIN products p ON p.product_id = sl.product_id
      JOIN users u ON u.user_id = p.created_by
      WHERE p.status = 'active'
        AND u.tenant_id = ${tenantId}
        AND sl.qty_on_hand > 0
      GROUP BY p.product_id, p.product_name, p.product_code
      ORDER BY total_value DESC
      LIMIT ${limit}
    `;

    const missingCostRows = await prisma.$queryRaw<
      { missing_count: number }[]
    >`
      SELECT COUNT(*)::int AS missing_count
      FROM stock_lots sl
      JOIN products p ON p.product_id = sl.product_id
      JOIN users u ON u.user_id = p.created_by
      WHERE p.status = 'active'
        AND u.tenant_id = ${tenantId}
        AND sl.qty_on_hand > 0
        AND sl.cost IS NULL
    `;

    const missingCount = Number(missingCostRows[0]?.missing_count || 0);
    if (missingCount > 0) {
      logger.warn('FIFO inventory value: some lots have no cost recorded', {
        missingCount,
      });
    }

    const summary = summaryRows[0] ?? { total_skus: 0, total_qty: 0, total_value: 0 };

    return {
      summary: {
        total_skus: Number(summary.total_skus || 0),
        total_qty: Number(summary.total_qty || 0),
        total_value: this.toDecimal(summary.total_value),
      },
      items: items.map((item) => ({
        product_id: item.product_id,
        product_name: item.product_name,
        product_code: item.product_code,
        quantity: Number(item.quantity || 0),
        // fifo_cost = weighted average of remaining lot costs (FIFO carrying cost per unit)
        cost_per_unit: this.toDecimal(item.fifo_cost),
        total_value: this.toDecimal(item.total_value),
      })),
    };
  }

  static async getLowStock(currentUserId: number, tenantId: number): Promise<StockReportResponse> {
    return ReportService.getStockReport({ low_stock_only: true }, currentUserId, tenantId);
  }

  static async getReorderAlerts(tenantId: number, limit = 10): Promise<ReorderAlertReport> {
    const items = await prisma.$queryRaw<
      {
        product_id: number;
        product_name: string;
        product_code: string | null;
        quantity: number;
        reorder_point: number;
      }[]
    >`
      SELECT
        s.product_id,
        s.quantity,
        p.product_name,
        p.product_code,
        COALESCE(p.reorder_point, p.low_stock_threshold, 0) AS reorder_point
      FROM stocks s
      JOIN products p ON p.product_id = s.product_id
      JOIN users u ON u.user_id = p.created_by
      WHERE p.status = 'active'
        AND u.tenant_id = ${tenantId}
        AND s.quantity <= COALESCE(p.reorder_point, p.low_stock_threshold, 0)
      ORDER BY s.quantity ASC, reorder_point ASC
      LIMIT ${limit}
    `;

    return {
      items: items.map((item) => ({
        product_id: item.product_id,
        product_name: item.product_name,
        product_code: item.product_code,
        quantity: Number(item.quantity || 0),
        reorder_point: Number(item.reorder_point || 0),
      })),
    };
  }
}
