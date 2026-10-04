"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_middleware_1 = require("../../../../shared/middleware/auth.middleware");
const validation_middleware_1 = require("../../../../shared/middleware/validation.middleware");
const customer_controller_1 = require("../../controllers/V1/customer.controller");
const customer_payment_controller_1 = require("../../controllers/customer-payment.controller");
const customer_validator_1 = require("../../validators/V1/customer.validator");
const router = (0, express_1.Router)();
// All routes require authentication
router.use(auth_middleware_1.authenticateToken);
// Customer Debt & Payment Ledger routes
router.get('/debts', (0, auth_middleware_1.requirePermission)('customers.manage', 'read'), customer_payment_controller_1.CustomerPaymentController.getDebtOverview);
router.post('/payments', (0, auth_middleware_1.requirePermission)('customers.manage', 'update'), customer_payment_controller_1.CustomerPaymentController.recordPayment);
router.get('/payments', (0, auth_middleware_1.requirePermission)('customers.manage', 'read'), customer_payment_controller_1.CustomerPaymentController.getPaymentHistory);
// List customers
router.get('/', (0, auth_middleware_1.requirePermission)('customers.manage', 'read'), customer_controller_1.CustomerController.listCustomers);
// Create customer
router.post('/', (0, auth_middleware_1.requirePermission)('customers.manage', 'create'), ...(0, validation_middleware_1.validateRequest)(customer_validator_1.createCustomerValidator), customer_controller_1.CustomerController.createCustomer);
// Get single customer details
router.get('/:id', (0, auth_middleware_1.requirePermission)('customers.manage', 'read'), ...(0, validation_middleware_1.validateRequest)(customer_validator_1.getCustomerValidator), customer_controller_1.CustomerController.getCustomerDetails);
// Update customer
router.put('/:id', (0, auth_middleware_1.requirePermission)('customers.manage', 'update'), ...(0, validation_middleware_1.validateRequest)(customer_validator_1.updateCustomerValidator), customer_controller_1.CustomerController.updateCustomer);
exports.default = router;
//# sourceMappingURL=customer.route.js.map