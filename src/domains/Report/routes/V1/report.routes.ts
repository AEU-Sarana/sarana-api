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
  getDailyReportValidator,
  validateRequest,
  ReportController.getDailyReport
);

/**
 * GET /api/v1/reports/sales
 */
router.get(
  '/sales',
  authenticateToken,
  requireAdmin,
  getSalesHistoryReportValidator,
  validateRequest,
  ReportController.getSalesHistoryReport
);

/**
 * GET /api/v1/reports/stock
 */
router.get(
  '/stock',
  authenticateToken,
  requireAdmin,
  getStockReportValidator,
  validateRequest,
  ReportController.getStockReport
);

/**
 * POST /api/v1/reports/export
 */
router.post(
  '/export',
  authenticateToken,
  requireAdmin,
  exportReportValidator,
  validateRequest,
  ReportController.exportReport
);

export default router;
