import { Router, type IRouter } from 'express';
import { authenticateToken, requirePermission } from '@src/shared/middleware/auth.middleware';
import { CustomerController } from '../../controllers/V1/customer.controller';
import { CustomerPaymentController } from '../../controllers/customer-payment.controller';

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

export default router;
