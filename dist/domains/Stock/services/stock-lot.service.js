"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.StockLotService = void 0;
const client_1 = __importDefault(require("../../../database/client"));
const generated_1 = require("../../../database/generated");
const exceptions_1 = require("../../../shared/exceptions");
const date_utils_1 = require("../../../shared/utils/date-utils");
const date_fns_1 = require("date-fns");
const fefo_1 = require("../utils/fefo");
class StockLotService {
    static mapLotInfo(row) {
        return {
            lot_id: row.id,
            product_id: row.productId ?? row.product_id,
            product_name: row.product?.productName ?? row.product_name ?? '',
            product_code: row.product?.productCode ?? row.product_code ?? null,
            qty_on_hand: Number(row.qtyOnHand ?? row.qty_on_hand ?? 0),
            received_at: row.receivedAt ?? row.received_at,
            expired_at: row.expiredAt ?? row.expired_at ?? null,
            cost: row.cost != null ? Number(row.cost) : null,
        };
    }
    static async createLotStockIn(params, tx) {
        const db = tx ?? client_1.default;
        const receivedAt = params.receivedAt ?? new Date();
        const lot = await db.stockLot.create({
            data: {
                productId: params.productId,
                qtyOnHand: params.quantity,
                receivedAt,
                expiredAt: params.expiredAt ?? null,
                cost: params.cost ?? null,
            },
        });
        const movement = await db.stockMovement.create({
            data: {
                productId: params.productId,
                lotId: lot.id,
                movementType: 'STOCK_IN',
                quantity: params.quantity,
                cost: params.cost ?? null,
                supplier: params.supplier ?? null,
                createdBy: params.createdBy,
                createdAt: receivedAt,
            },
        });
        return { lot, movement };
    }
    static async allocateStockOutFEFO(params, tx) {
        if (params.quantity <= 0) {
            throw new exceptions_1.ValidationException('Quantity must be greater than 0');
        }
        const execute = async (db) => {
            const today = (0, date_utils_1.formatDate)(new Date());
            const lots = await db.$queryRaw(generated_1.Prisma.sql `
        SELECT id, product_id, qty_on_hand, received_at, expired_at, cost
        FROM stock_lots
        WHERE product_id = ${params.productId}
          AND qty_on_hand > 0
          ${params.allowExpired
                ? generated_1.Prisma.empty
                : generated_1.Prisma.sql `AND (expired_at IS NULL OR expired_at >= ${today}::date)`}
        ORDER BY (expired_at IS NULL) ASC, expired_at ASC, received_at ASC
        FOR UPDATE
      `);
            const fefoLots = lots.map((lot) => ({
                id: lot.id,
                qtyOnHand: Number(lot.qty_on_hand),
                receivedAt: new Date(lot.received_at),
                expiredAt: lot.expired_at ? new Date(lot.expired_at) : null,
            }));
            const { allocations, remaining } = (0, fefo_1.allocateFefoLots)(fefoLots, params.quantity, new Date(), Boolean(params.allowExpired));
            if (remaining > 0) {
                if (!params.allowNegative) {
                    throw new exceptions_1.BusinessLogicException('INSUFFICIENT_STOCK', 'INSUFFICIENT_STOCK', 409, { remaining });
                }
                await db.stockMovement.create({
                    data: {
                        productId: params.productId,
                        lotId: null,
                        movementType: 'STOCK_OUT',
                        quantity: -remaining,
                        cost: null,
                        price: params.price ?? null,
                        reason: params.reason ?? 'NEGATIVE_STOCK',
                        orderId: params.orderId ?? null,
                        createdBy: params.createdBy,
                        createdAt: new Date(),
                    },
                });
            }
            let totalCost = 0;
            const detailedAllocations = [];
            for (const allocation of allocations) {
                const lot = lots.find((l) => l.id === allocation.lotId);
                if (!lot)
                    continue;
                const allocationCost = lot.cost != null ? Number(lot.cost) : 0;
                totalCost += allocationCost * allocation.quantity;
                detailedAllocations.push({
                    ...allocation,
                    cost: allocationCost
                });
                await db.stockLot.update({
                    where: { id: allocation.lotId },
                    data: {
                        qtyOnHand: { decrement: allocation.quantity },
                        updatedAt: new Date(),
                    },
                });
                await db.stockMovement.create({
                    data: {
                        productId: params.productId,
                        lotId: allocation.lotId,
                        movementType: 'STOCK_OUT',
                        quantity: -allocation.quantity,
                        cost: lot.cost ?? null,
                        price: params.price ?? null,
                        reason: params.reason ?? null,
                        orderId: params.orderId ?? null,
                        createdBy: params.createdBy,
                        createdAt: new Date(),
                    },
                });
            }
            return {
                allocations: detailedAllocations,
                totalCost,
                remaining
            };
        };
        if (tx) {
            return execute(tx);
        }
        return client_1.default.$transaction(async (db) => execute(db));
    }
    static async listNearExpiry(days = 30) {
        const start = (0, date_fns_1.startOfDay)(new Date());
        const end = (0, date_fns_1.endOfDay)((0, date_fns_1.addDays)(start, days));
        const lots = await client_1.default.stockLot.findMany({
            where: {
                qtyOnHand: { gt: 0 },
                expiredAt: {
                    gte: start,
                    lte: end,
                }
            },
            include: {
                product: { select: { productName: true, productCode: true } },
            },
            orderBy: [
                { expiredAt: 'asc' },
                { receivedAt: 'asc' },
            ],
        });
        return {
            days,
            lots: lots.map((lot) => this.mapLotInfo(lot)),
        };
    }
    static async listExpired() {
        const today = (0, date_fns_1.startOfDay)(new Date());
        const lots = await client_1.default.stockLot.findMany({
            where: {
                qtyOnHand: { gt: 0 },
                expiredAt: { lt: today }
            },
            include: {
                product: { select: { productName: true, productCode: true } },
            },
            orderBy: [
                { expiredAt: 'asc' },
                { receivedAt: 'asc' },
            ],
        });
        return {
            lots: lots.map((lot) => this.mapLotInfo(lot)),
        };
    }
    static async listLotsExpiringIn(days) {
        const targetDate = (0, date_fns_1.startOfDay)((0, date_fns_1.addDays)(new Date(), days));
        const nextDate = (0, date_fns_1.addDays)(targetDate, 1);
        const lots = await client_1.default.stockLot.findMany({
            where: {
                qtyOnHand: { gt: 0 },
                expiredAt: {
                    gte: targetDate,
                    lt: nextDate,
                }
            },
            include: {
                product: { select: { productName: true, productCode: true } },
            },
            orderBy: [
                { receivedAt: 'asc' },
            ],
        });
        return lots.map((lot) => this.mapLotInfo(lot));
    }
}
exports.StockLotService = StockLotService;
//# sourceMappingURL=stock-lot.service.js.map