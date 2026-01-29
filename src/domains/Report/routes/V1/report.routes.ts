import { Router } from 'express';
import { authenticateToken } from '@src/shared/middleware/auth.middleware';
import { requireAdmin } from '@src/shared/middleware/authorization.middleware';
import { validateRequest } from '@src/shared/middleware/validation.middleware';
import {
  getDailyReportValidator,
  getSalesHistoryReportValidator,
  getStockReportValidator,
  exportReportValidator,
} from '../../validators/V1/index';

import { ReportController } from '../../controllers/V1/report.controller';

const router = Router();

/**
 * GET /api/v1/reports/daily
 */
router.get(
  '/daily',
  authenticateToken,
  requireAdmin,
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
 * POST /api/v1/reports/export
 */
router.post(
  '/export',
  authenticateToken,
  requireAdmin,
  ...validateRequest(exportReportValidator),
  ReportController.exportReport
);

// Export status and download endpoints removed since we now process synchronously

export default router;
