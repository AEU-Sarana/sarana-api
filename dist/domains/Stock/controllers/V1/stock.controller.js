"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.StockController = void 0;
const stock_service_1 = require("../../../../domains/Stock/services/stock.service");
const stock_lot_service_1 = require("../../../../domains/Stock/services/stock-lot.service");
const stock_movement_service_1 = require("../../../../domains/Stock/services/stock-movement.service");
const logger_1 = require("../../../../shared/utils/logger");
// Helper function to safely extract string from query/param
function getStringValue(value) {
    if (!value)
        return undefined;
    if (Array.isArray(value))
        return value[0];
    return typeof value === 'string' ? value : String(value);
}
class StockController {
    static async getStock(req, res) {
        try {
            const user = req.user;
            const productIdStr = getStringValue(req.params.productId);
            const stockVersionStr = getStringValue(req.query.stock_version);
            const statusStr = getStringValue(req.query.status);
            const categoryStr = getStringValue(req.query.category);
            const categoryIdStr = getStringValue(req.query.category_id);
            const searchStr = getStringValue(req.query.search);
            const pageStr = getStringValue(req.query.page);
            const limitStr = getStringValue(req.query.limit);
            const barcodeStr = getStringValue(req.query.barcode);
            const productStatusStr = getStringValue(req.query.product_status);
            logger_1.logger.info('Get stock request', {
                productId: productIdStr,
                userId: user.userId,
                path: req.path,
                url: req.url,
                filters: { stock_version: stockVersionStr, status: statusStr, category: categoryStr, category_id: categoryIdStr, search: searchStr, barcode: barcodeStr, product_status: productStatusStr },
            });
            const normalize = (v) => (v && v.trim() !== '' ? v.trim() : undefined);
            const request = {
                product_id: productIdStr ? parseInt(productIdStr, 10) : undefined,
                version: normalize(stockVersionStr) ? parseInt(stockVersionStr, 10) : undefined,
                status: statusStr,
                category: categoryStr,
                category_id: categoryIdStr ? parseInt(categoryIdStr, 10) : undefined,
                search: searchStr,
                barcode: barcodeStr,
                page: pageStr ? parseInt(pageStr, 10) : 1,
                limit: limitStr ? parseInt(limitStr, 10) : 50,
                product_status: productStatusStr,
            };
            const response = await stock_service_1.StockService.getStock(request, user.userId);
            logger_1.logger.info('Get stock response', {
                productId: request.product_id,
                isSingleStock: !!request.product_id,
                hasStocks: 'stocks' in response,
            });
            res.status(200).json({
                success: true,
                data: response,
                message: 'Stock retrieved successfully',
            });
        }
        catch (error) {
            logger_1.logger.error('Get stock error', {
                error: error.message,
                stack: error.stack,
                productId: req.params.productId,
            });
            throw error;
        }
    }
    static async stockIn(req, res) {
        try {
            const user = req.user;
            const request = {
                product_id: req.body.product_id,
                quantity: req.body.quantity,
                cost: req.body.cost,
                supplier: req.body.supplier,
                date: req.body.date ? new Date(req.body.date) : undefined,
                received_at: req.body.received_at ? new Date(req.body.received_at) : undefined,
                expired_at: req.body.expired_at ? new Date(req.body.expired_at) : undefined,
            };
            const response = await stock_service_1.StockService.stockIn(request, user.userId);
            res.status(201).json({
                success: true,
                data: response,
                message: 'Stock added successfully',
            });
        }
        catch (error) {
            logger_1.logger.error('Stock In error', { error: error.message });
            throw error;
        }
    }
    static async stockAdjust(req, res) {
        try {
            const user = req.user;
            const request = {
                product_id: req.body.product_id,
                quantity: req.body.quantity,
                reason: req.body.reason,
            };
            const response = await stock_service_1.StockService.stockAdjust(request, user.userId);
            res.status(201).json({
                success: true,
                data: response,
                message: 'Stock adjusted successfully',
            });
        }
        catch (error) {
            logger_1.logger.error('Stock adjust error', { error: error.message });
            throw error;
        }
    }
    static async stockReturn(req, res) {
        try {
            const user = req.user;
            const request = {
                product_id: req.body.product_id,
                quantity: req.body.quantity,
                order_id: req.body.order_id,
                reason: req.body.reason,
            };
            const response = await stock_service_1.StockService.stockReturn(request, user.userId);
            res.status(201).json({
                success: true,
                data: response,
                message: 'Stock returned successfully',
            });
        }
        catch (error) {
            logger_1.logger.error('Stock return error', { error: error.message });
            throw error;
        }
    }
    static async getStockMovements(req, res) {
        try {
            const user = req.user;
            const productIdStr = getStringValue(req.query.product_id);
            const pageStr = getStringValue(req.query.page);
            const limitStr = getStringValue(req.query.limit);
            const request = {
                product_id: productIdStr ? parseInt(productIdStr, 10) : undefined,
                movement_type: getStringValue(req.query.movement_type),
                date_from: getStringValue(req.query.date_from),
                date_to: getStringValue(req.query.date_to),
                product_name: getStringValue(req.query.product_name),
                barcode: getStringValue(req.query.barcode),
                page: pageStr ? parseInt(pageStr, 10) : 1,
                limit: limitStr ? parseInt(limitStr, 10) : 50,
            };
            const response = await stock_movement_service_1.StockMovementService.getStockMovements(request, user.userId);
            res.status(200).json({
                success: true,
                data: response,
                message: 'Stock movements retrieved',
            });
        }
        catch (error) {
            logger_1.logger.error('Get stock movements error', { error: error.message });
            throw error;
        }
    }
    static async getNearExpiry(req, res) {
        try {
            const user = req.user;
            const days = req.query.days ? parseInt(String(req.query.days), 10) : 30;
            const response = await stock_lot_service_1.StockLotService.listNearExpiry(days);
            res.status(200).json({
                success: true,
                data: response,
                message: 'Near expiry lots retrieved',
            });
        }
        catch (error) {
            logger_1.logger.error('Get near expiry lots error', { error: error.message });
            throw error;
        }
    }
    static async getExpired(req, res) {
        try {
            const user = req.user;
            const response = await stock_lot_service_1.StockLotService.listExpired();
            res.status(200).json({
                success: true,
                data: response,
                message: 'Expired lots retrieved',
            });
        }
        catch (error) {
            logger_1.logger.error('Get expired lots error', { error: error.message });
            throw error;
        }
    }
}
exports.StockController = StockController;
//# sourceMappingURL=stock.controller.js.map