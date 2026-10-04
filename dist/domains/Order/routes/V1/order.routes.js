"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_middleware_1 = require("../../../../shared/middleware/auth.middleware");
const validation_middleware_1 = require("../../../../shared/middleware/validation.middleware");
const order_controller_1 = require("../../../../domains/Order/controllers/V1/order.controller");
const index_1 = require("../../../../domains/Order/validators/V1/index");
const router = (0, express_1.Router)();
// All routes require authentication
router.use(auth_middleware_1.authenticateToken);
// Create simple online order - permission guarded
router.post('/', (0, auth_middleware_1.requirePermission)('pos.checkout', 'create'), ...(0, validation_middleware_1.validateRequest)(index_1.createOrderValidator), order_controller_1.OrderController.createOrder);
// List pending cancellation requests (Admin only)
router.get('/cancellation-requests', (0, auth_middleware_1.requirePermission)('sales.view_history', 'read'), order_controller_1.OrderController.listCancellationRequests);
// List orders - permission guarded
router.get('/', (0, auth_middleware_1.requirePermission)('sales.view_history', 'read'), ...(0, validation_middleware_1.validateRequest)(index_1.listOrdersValidator), order_controller_1.OrderController.listOrders);
// Get order details - permission guarded
router.get('/:id', (0, auth_middleware_1.requirePermission)('sales.view_history', 'read'), ...(0, validation_middleware_1.validateRequest)(index_1.getOrderValidator), order_controller_1.OrderController.getOrder);
// Request order cancellation (Cashier / Admin)
router.post('/:id/request-cancel', (0, auth_middleware_1.requirePermission)('sales.view_history', 'update'), ...(0, validation_middleware_1.validateRequest)(index_1.getOrderValidator), order_controller_1.OrderController.requestCancellation);
// Approve order cancellation (Admin only)
router.post('/:id/approve-cancel', (0, auth_middleware_1.requirePermission)('sales.view_history', 'delete'), ...(0, validation_middleware_1.validateRequest)(index_1.getOrderValidator), order_controller_1.OrderController.approveCancellation);
// Reject order cancellation (Admin only)
router.post('/:id/reject-cancel', (0, auth_middleware_1.requirePermission)('sales.view_history', 'delete'), ...(0, validation_middleware_1.validateRequest)(index_1.getOrderValidator), order_controller_1.OrderController.rejectCancellation);
exports.default = router;
//# sourceMappingURL=order.routes.js.map