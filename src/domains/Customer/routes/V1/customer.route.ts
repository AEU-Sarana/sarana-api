import { Router, type IRouter } from 'express';
import { authenticateToken } from '@src/shared/middleware/auth.middleware';
import { requirePermission } from '@src/shared/middleware/authorization.middleware';
import { Permission } from '@src/shared/config/permissions';
import { CustomerController } from '../../controllers/V1/customer.controller';

const router: IRouter = Router();

// All routes require authentication
router.use(authenticateToken);

// List customers
router.get(
  '/',
  requirePermission(Permission.DASHBOARD_VIEW),
  CustomerController.listCustomers
);

export default router;
