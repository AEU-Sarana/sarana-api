import { Router, type IRouter } from 'express';
import { authenticateToken } from '@src/shared/middleware/auth.middleware';
import { requirePermission } from '@src/shared/middleware/authorization.middleware';
import { Permission } from '@src/shared/config/permissions';
import { DashboardController } from '@src/domains/Dashbord/controllers/V1/dashboard.controller';

const router: IRouter = Router();

// All routes require authentication
router.use(authenticateToken);

// Dashboard overview - Admin or Seller (permission-based)
router.get(
  '/overview',
  requirePermission(Permission.DASHBOARD_VIEW),
  DashboardController.getOverview
);

export default router;
