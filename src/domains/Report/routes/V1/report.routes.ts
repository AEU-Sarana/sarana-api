import { Router, type IRouter } from 'express';
import { authenticateToken, requirePermission } from '@src/shared/middleware/auth.middleware';
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

router.use(authenticateToken);

/**
 * GET /api/v1/reports/daily
 */
router.get(
  '/daily',
  requirePermission('reports.daily_shift', 'read'),
  ...validateRequest(getDailyReportValidator),
  ReportController.getDailyReport
);

/**
 * GET /api/v1/reports/sales
 */
router.get(
  '/sales',
  requirePermission('reports.full_analytics', 'read'),
  ...validateRequest(getSalesHistoryReportValidator),
  ReportController.getSalesHistoryReport
);

/**
 * GET /api/v1/reports/stock
 */
router.get(
  '/stock',
  requirePermission('reports.full_analytics', 'read'),
  ...validateRequest(getStockReportValidator),
  ReportController.getStockReport
);

/**
 * GET /api/v1/reports/income
 */
router.get(
  '/income',
  requirePermission('reports.full_analytics', 'read'),
  ...validateRequest(getIncomeReportValidator),
  ReportController.getIncomeReport
);

/**
 * POST /api/v1/reports/export
 */
router.post(
  '/export',
  requirePermission('reports.full_analytics', 'create'),
  ...validateRequest(exportReportValidator),
  ReportController.exportReport
);

export default router;
