"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_middleware_1 = require("../../../../shared/middleware/auth.middleware");
const validation_middleware_1 = require("../../../../shared/middleware/validation.middleware");
const stock_controller_1 = require("../../../../domains/Stock/controllers/V1/stock.controller");
const V1_1 = require("../../validators/V1");
const router = (0, express_1.Router)();
router.use(auth_middleware_1.authenticateToken);
router.get('/near-expiry', (0, auth_middleware_1.requirePermission)('stock.view', 'read'), ...(0, validation_middleware_1.validateRequest)(V1_1.nearExpiryValidator), stock_controller_1.StockController.getNearExpiry);
router.get('/expired', (0, auth_middleware_1.requirePermission)('stock.view', 'read'), stock_controller_1.StockController.getExpired);
exports.default = router;
//# sourceMappingURL=inventory.route.js.map