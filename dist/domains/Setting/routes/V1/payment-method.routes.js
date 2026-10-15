"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_middleware_1 = require("../../../../shared/middleware/auth.middleware");
const authorization_middleware_1 = require("../../../../shared/middleware/authorization.middleware");
const payment_method_controller_1 = require("../../../../domains/Setting/controllers/V1/payment-method.controller");
const router = (0, express_1.Router)();
// All routes require authentication
router.use(auth_middleware_1.authenticateToken);
// List payment methods (cashiers get active only by default, admin can pass include_inactive=true)
router.get('/', payment_method_controller_1.PaymentMethodController.listPaymentMethods);
// Get single payment method
router.get('/:id', payment_method_controller_1.PaymentMethodController.getPaymentMethod);
// Admin-only management endpoints
router.post('/', authorization_middleware_1.requireAdmin, payment_method_controller_1.PaymentMethodController.createPaymentMethod);
router.put('/:id', authorization_middleware_1.requireAdmin, payment_method_controller_1.PaymentMethodController.updatePaymentMethod);
router.patch('/:id/toggle', authorization_middleware_1.requireAdmin, payment_method_controller_1.PaymentMethodController.toggleStatus);
router.delete('/:id', authorization_middleware_1.requireAdmin, payment_method_controller_1.PaymentMethodController.deletePaymentMethod);
exports.default = router;
//# sourceMappingURL=payment-method.routes.js.map