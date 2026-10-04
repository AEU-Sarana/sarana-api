"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.InventoryReportService = void 0;
const client_1 = __importDefault(require("../../../database/client"));
const generated_1 = require("../../../database/generated");
const report_service_1 = require("../../../domains/Report/services/report.service");
const logger_1 = require("../../../shared/utils/logger");
class InventoryReportService {
    static toDecimal(value) {
        return new generated_1.Prisma.Decimal(value ?? 0);
    }
    static async getStockOnHand(tenantId, limit = 10) {
        const summaryRows = await client_1.default.$queryRaw `
      SELECT
        COUNT(DISTINCT s.product_id)::int AS total_skus,
        COALESCE(SUM(s.quantity), 0)::int AS total_qty
      FROM stocks s
      JOIN products p ON p.product_id = s.product_id
      WHERE p.status = 'active'
    `;
        const items = await client_1.default.$queryRaw `
      SELECT s.product_id, s.quantity, p.product_name, p.product_code
      FROM stocks s
      JOIN products p ON p.product_id = s.product_id
      WHERE p.status = 'active'
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
    static async getInventoryValue(tenantId, limit = 10) {
        // FIFO inventory valuation: sum cost from actual stock lots (qty_on_hand × lot cost)
        // This reflects the true FIFO carrying value of remaining inventory.
        const summaryRows = await client_1.default.$queryRaw `
      SELECT
        COUNT(DISTINCT sl.product_id)::int AS total_skus,
        COALESCE(SUM(sl.qty_on_hand), 0)::int AS total_qty,
        COALESCE(SUM(sl.qty_on_hand * COALESCE(sl.cost, 0)), 0) AS total_value
      FROM stock_lots sl
      JOIN products p ON p.product_id = sl.product_id
      WHERE p.status = 'active'
        AND sl.qty_on_hand > 0
    `;
        const items = await client_1.default.$queryRaw `
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
      WHERE p.status = 'active'
        AND sl.qty_on_hand > 0
      GROUP BY p.product_id, p.product_name, p.product_code
      ORDER BY total_value DESC
      LIMIT ${limit}
    `;
        const missingCostRows = await client_1.default.$queryRaw `
      SELECT COUNT(*)::int AS missing_count
      FROM stock_lots sl
      JOIN products p ON p.product_id = sl.product_id
      WHERE p.status = 'active'
        AND sl.qty_on_hand > 0
        AND sl.cost IS NULL
    `;
        const missingCount = Number(missingCostRows[0]?.missing_count || 0);
        if (missingCount > 0) {
            logger_1.logger.warn('FIFO inventory value: some lots have no cost recorded', {
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
    static async getLowStock(currentUserId, tenantId) {
        return report_service_1.ReportService.getStockReport({ low_stock_only: true }, currentUserId);
    }
    static async getReorderAlerts(tenantId, limit = 10) {
        const items = await client_1.default.$queryRaw `
      SELECT
        s.product_id,
        s.quantity,
        p.product_name,
        p.product_code,
        COALESCE(p.reorder_point, p.low_stock_threshold, 0) AS reorder_point
      FROM stocks s
      JOIN products p ON p.product_id = s.product_id
      WHERE p.status = 'active'
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
exports.InventoryReportService = InventoryReportService;
//# sourceMappingURL=inventory-report.service.js.map