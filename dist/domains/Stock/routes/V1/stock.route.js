"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_middleware_1 = require("../../../../shared/middleware/auth.middleware");
const validation_middleware_1 = require("../../../../shared/middleware/validation.middleware");
const stock_controller_1 = require("../../../../domains/Stock/controllers/V1/stock.controller");
const V1_1 = require("../../validators/V1");
const router = (0, express_1.Router)();
// All routes require authentication
router.use(auth_middleware_1.authenticateToken);
// Get stock levels
router.get('/', (0, auth_middleware_1.requirePermission)('stock.view', 'read'), ...(0, validation_middleware_1.validateRequest)(V1_1.getStockValidator), stock_controller_1.StockController.getStock);
// Get stock movements (MUST be before /:productId route)
router.get('/movements', (0, auth_middleware_1.requirePermission)('stock.view', 'read'), ...(0, validation_middleware_1.validateRequest)(V1_1.getStockMovementsValidator), stock_controller_1.StockController.getStockMovements);
// Stock In
router.post('/in', (0, auth_middleware_1.requirePermission)('stock.stock_in', 'create'), ...(0, validation_middleware_1.validateRequest)(V1_1.stockInValidator), stock_controller_1.StockController.stockIn);
// Stock Adjustment
router.post('/adjust', (0, auth_middleware_1.requirePermission)('stock.adjustments', 'create'), ...(0, validation_middleware_1.validateRequest)(V1_1.stockAdjustValidator), stock_controller_1.StockController.stockAdjust);
// Stock Return
router.post('/return', (0, auth_middleware_1.requirePermission)('stock.adjustments', 'create'), ...(0, validation_middleware_1.validateRequest)(V1_1.stockReturnValidator), stock_controller_1.StockController.stockReturn);
// Get stock for product
router.get('/:productId', (0, auth_middleware_1.requirePermission)('stock.view', 'read'), ...(0, validation_middleware_1.validateRequest)(V1_1.getStockValidator), stock_controller_1.StockController.getStock);
exports.default = router;
//# sourceMappingURL=stock.route.js.map