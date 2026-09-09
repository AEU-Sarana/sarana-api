import { Router, type IRouter } from 'express';
import { authenticateToken, requirePermission } from '@src/shared/middleware/auth.middleware';
import { validateRequest } from '@src/shared/middleware/validation.middleware';
import { CustomerController } from '../../controllers/V1/customer.controller';
import { CustomerPaymentController } from '../../controllers/customer-payment.controller';
import {
  createCustomerValidator,
  updateCustomerValidator,
  getCustomerValidator,
} from '../../validators/V1/customer.validator';

const router: IRouter = Router();

// All routes require authentication
router.use(authenticateToken);

// Customer Debt & Payment Ledger routes
router.get('/debts', requirePermission('customers.manage', 'read'), CustomerPaymentController.getDebtOverview);
router.post('/payments', requirePermission('customers.manage', 'update'), CustomerPaymentController.recordPayment);
router.get('/payments', requirePermission('customers.manage', 'read'), CustomerPaymentController.getPaymentHistory);

// List customers
router.get(
  '/',
  requirePermission('customers.manage', 'read'),
  CustomerController.listCustomers
);

// Create customer
router.post(
  '/',
  requirePermission('customers.manage', 'create'),
  ...validateRequest(createCustomerValidator),
  CustomerController.createCustomer
);

// Get single customer details
router.get(
  '/:id',
  requirePermission('customers.manage', 'read'),
  ...validateRequest(getCustomerValidator),
  CustomerController.getCustomerDetails
);

// Update customer
router.put(
  '/:id',
  requirePermission('customers.manage', 'update'),
  ...validateRequest(updateCustomerValidator),
  CustomerController.updateCustomer
);

export default router;
