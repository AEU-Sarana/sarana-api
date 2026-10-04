"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_middleware_1 = require("../../../../shared/middleware/auth.middleware");
const po_controller_1 = require("../../../../domains/Purchasing/controllers/V1/po.controller");
const router = (0, express_1.Router)();
router.use(auth_middleware_1.authenticateToken);
router.get('/orders', (0, auth_middleware_1.requirePermission)('purchasing.create_po', 'read'), po_controller_1.POController.listPOs);
router.get('/orders/:id', (0, auth_middleware_1.requirePermission)('purchasing.create_po', 'read'), po_controller_1.POController.getPO);
router.get('/orders/:id/pdf', (0, auth_middleware_1.requirePermission)('purchasing.create_po', 'read'), po_controller_1.POController.downloadPOPDF);
router.post('/orders', (0, auth_middleware_1.requirePermission)('purchasing.create_po', 'create'), po_controller_1.POController.createPO);
router.patch('/orders/:id/status', (0, auth_middleware_1.requirePermission)('purchasing.approve_po', 'update'), po_controller_1.POController.updatePOStatus);
router.post('/goods-received', (0, auth_middleware_1.requirePermission)('purchasing.receive_stock', 'create'), po_controller_1.POController.recordGoodsReceived);
exports.default = router;
//# sourceMappingURL=po.routes.js.map