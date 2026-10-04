"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.StockMovementService = void 0;
const client_1 = __importDefault(require("../../../database/client"));
const audit_log_service_1 = require("../../../shared/services/audit-log.service");
class StockMovementService {
    /**
     * Get stock movements (history)
     */
    static async getStockMovements(request, currentUserId) {
        const { product_id, movement_type, date_from, date_to, barcode, product_name, page = 1, limit = 50, } = request;
        const where = {};
        if (product_id)
            where.productId = product_id;
        if (movement_type)
            where.movementType = movement_type;
        if (date_from || date_to) {
            where.createdAt = {};
            if (date_from)
                where.createdAt.gte = new Date(date_from);
            if (date_to)
                where.createdAt.lte = new Date(date_to);
        }
        if (barcode || product_name) {
            where.product = {};
            if (barcode) {
                where.product.barcode = { contains: barcode, mode: 'insensitive' };
            }
            if (product_name) {
                where.product.productName = { contains: product_name, mode: 'insensitive' };
            }
        }
        const total = await client_1.default.stockMovement.count({ where });
        const skip = (page - 1) * limit;
        const movements = await client_1.default.stockMovement.findMany({
            where,
            skip,
            take: limit,
            include: {
                product: {
                    select: {
                        productId: true,
                        productName: true,
                        productCode: true,
                        barcode: true,
                        imagePath: true,
                    },
                },
                stockLot: {
                    select: {
                        expiredAt: true,
                    },
                },
                user: {
                    select: {
                        userId: true,
                        username: true,
                        fullName: true,
                    },
                },
            },
            orderBy: { createdAt: 'desc' },
        });
        await audit_log_service_1.auditLogService.createAuditLog({
            userId: currentUserId,
            action: 'VIEW_STOCK_MOVEMENTS',
            resource: 'StockMovement',
            details: { filters: { product_id, movement_type, date_from, date_to, barcode, product_name } },
        });
        return {
            movements: movements.map((m) => ({
                movement_id: m.movementId,
                product_id: m.productId,
                product_name: m.product.productName,
                barcode: m.product.barcode,
                movement_type: m.movementType,
                quantity: m.quantity,
                cost: m.cost ? Number(m.cost) : null,
                supplier: m.supplier,
                image_path: m.product.imagePath,
                expired_at: m.stockLot?.expiredAt,
                created_at: m.createdAt,
            })),
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
            },
        };
    }
}
exports.StockMovementService = StockMovementService;
//# sourceMappingURL=stock-movement.service.js.map