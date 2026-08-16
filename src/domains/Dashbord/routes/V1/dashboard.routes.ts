import { Router, type IRouter } from 'express';
import { authenticateToken } from '@src/shared/middleware/auth.middleware';
import { DashboardController } from '@src/domains/Dashbord/controllers/V1/dashboard.controller';

const router: IRouter = Router();

// All routes require authentication
router.use(authenticateToken);

// Dashboard overview - Admin or Seller/Staff
router.get(
  '/overview',
  DashboardController.getOverview
);

export default router;
