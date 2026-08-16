import { Router, type IRouter } from 'express';
import { authenticateToken, requirePermission } from '@src/shared/middleware/auth.middleware';
import { CustomerController } from '../../controllers/V1/customer.controller';

const router: IRouter = Router();

// All routes require authentication
router.use(authenticateToken);

// List customers
router.get(
  '/',
  requirePermission('customers.manage', 'read'),
  CustomerController.listCustomers
);

export default router;
