"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_middleware_1 = require("../../../../shared/middleware/auth.middleware");
const supplier_controller_1 = require("../../../../domains/Supplier/controllers/V1/supplier.controller");
const supplier_payment_controller_1 = require("../../../../domains/Supplier/controllers/supplier-payment.controller");
const router = (0, express_1.Router)();
router.use(auth_middleware_1.authenticateToken);
// Debt & Payment routes
router.get('/debts', (0, auth_middleware_1.requirePermission)('purchasing.manage_suppliers', 'read'), supplier_payment_controller_1.SupplierPaymentController.getDebtOverview);
router.post('/payments', (0, auth_middleware_1.requirePermission)('purchasing.manage_suppliers', 'update'), supplier_payment_controller_1.SupplierPaymentController.recordPayment);
router.get('/payments', (0, auth_middleware_1.requirePermission)('purchasing.manage_suppliers', 'read'), supplier_payment_controller_1.SupplierPaymentController.getPaymentHistory);
// Supplier CRUD routes
router.get('/', (0, auth_middleware_1.requirePermission)('purchasing.manage_suppliers', 'read'), supplier_controller_1.SupplierController.listSuppliers);
router.get('/:id', (0, auth_middleware_1.requirePermission)('purchasing.manage_suppliers', 'read'), supplier_controller_1.SupplierController.getSupplier);
router.post('/', (0, auth_middleware_1.requirePermission)('purchasing.manage_suppliers', 'create'), supplier_controller_1.SupplierController.createSupplier);
router.put('/:id', (0, auth_middleware_1.requirePermission)('purchasing.manage_suppliers', 'update'), supplier_controller_1.SupplierController.updateSupplier);
router.delete('/:id', (0, auth_middleware_1.requirePermission)('purchasing.manage_suppliers', 'delete'), supplier_controller_1.SupplierController.deleteSupplier);
exports.default = router;
//# sourceMappingURL=supplier.routes.js.map