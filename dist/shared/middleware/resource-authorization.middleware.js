"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authorizeOrderAccess = authorizeOrderAccess;
const permissions_1 = require("../../shared/config/permissions");
const client_1 = __importDefault(require("../../database/client"));
/**
 * Middleware to authorize order access
 * - Admin can access all orders within tenant
 * - Seller can only access own orders
 */
async function authorizeOrderAccess(req, res, next) {
    if (!req.user) {
        res.status(401).json({
            success: false,
            message: 'Authentication required',
            code: 'AUTH_REQUIRED',
        });
        return;
    }
    const orderIdParam = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const orderId = parseInt(orderIdParam || '', 10);
    if (isNaN(orderId) || !orderIdParam) {
        res.status(400).json({
            success: false,
            message: 'Invalid order ID',
            code: 'INVALID_ORDER_ID',
        });
        return;
    }
    try {
        const order = await client_1.default.order.findUnique({
            where: { orderId },
        });
        if (!order) {
            res.status(404).json({
                success: false,
                message: 'Order not found',
                code: 'ORDER_NOT_FOUND',
            });
            return;
        }
        // Admin can access all orders
        if (req.user.role === permissions_1.Role.ADMIN) {
            req.order = order;
            return next();
        }
        // Seller can only access own orders
        if (order.sellerId === req.user.userId) {
            req.order = order;
            return next();
        }
        res.status(403).json({
            success: false,
            message: 'Access denied to this order',
            code: 'ORDER_ACCESS_DENIED',
        });
    }
    catch (error) {
        next(error);
    }
}
//# sourceMappingURL=resource-authorization.middleware.js.map