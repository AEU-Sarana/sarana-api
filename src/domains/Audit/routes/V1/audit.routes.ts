import { Router, type IRouter } from 'express';
import { authenticateToken, requirePermission } from '@src/shared/middleware/auth.middleware';
import { validateRequest } from '@src/shared/middleware/validation.middleware';
import { AuditController } from '@src/domains/Audit/controllers/V1/audit.controller';
import {
  listAuditLogsValidator,
  getAuditLogValidator,
} from '@src/domains/Audit/validators/V1/audit.validator';

const router: IRouter = Router();

// All audit routes require authentication and manage permission (Admin automatically has full access)
router.use(authenticateToken);

// 1. Get filter dropdown options
router.get(
  '/filters',
  requirePermission('users.manage', 'read'),
  AuditController.getFilterOptions
);

// 2. Get summary statistics and trends
router.get(
  '/stats',
  requirePermission('users.manage', 'read'),
  AuditController.getStats
);

// 3. Export audit logs to CSV
router.get(
  '/export',
  requirePermission('users.manage', 'read'),
  AuditController.exportLogs
);

// 4. List audit logs with pagination and filters
router.get(
  '/',
  requirePermission('users.manage', 'read'),
  ...validateRequest(listAuditLogsValidator),
  AuditController.listLogs
);

// 5. Get audit log by ID
router.get(
  '/:id',
  requirePermission('users.manage', 'read'),
  ...validateRequest(getAuditLogValidator),
  AuditController.getLogDetails
);

export default router;
