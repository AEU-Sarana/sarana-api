import { Router, type IRouter } from 'express';
import { authenticateToken } from '@src/shared/middleware/auth.middleware';
import { requireAdmin, requireAdminOrCashier } from '@src/shared/middleware/authorization.middleware';
import { validateRequest } from '@src/shared/middleware/validation.middleware';
import {
  getDailyReportValidator,
  getSalesHistoryReportValidator,
  getStockReportValidator,
  exportReportValidator,
  getIncomeReportValidator,
} from '../../validators/V1/index';

import { ReportController } from '../../controllers/V1/report.controller';

const router: IRouter = Router();

/**
 * GET /api/v1/reports/daily
 */
router.get(
  '/daily',
  authenticateToken,
  requireAdminOrCashier,
  ...validateRequest(getDailyReportValidator),
  ReportController.getDailyReport
);

/**
 * GET /api/v1/reports/sales
 */
router.get(
  '/sales',
  authenticateToken,
  requireAdmin,
  ...validateRequest(getSalesHistoryReportValidator),
  ReportController.getSalesHistoryReport
);

/**
 * GET /api/v1/reports/stock
 */
router.get(
  '/stock',
  authenticateToken,
  requireAdmin,
  ...validateRequest(getStockReportValidator),
  ReportController.getStockReport
);

/**
 * GET /api/v1/reports/income
 */
router.get(
  '/income',
  authenticateToken,
  requireAdmin,
  ...validateRequest(getIncomeReportValidator),
  ReportController.getIncomeReport
);

/**
 * POST /api/v1/reports/export
 */
router.post(
  '/export',
  authenticateToken,
  requireAdmin,
  ...validateRequest(exportReportValidator),
  ReportController.exportReport
);

export default router;
