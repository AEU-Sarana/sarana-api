import { Router, type IRouter } from 'express';
import { authenticateToken } from '@src/shared/middleware/auth.middleware';
import { requireAdmin, requirePermission } from '@src/shared/middleware/authorization.middleware';
import { validateRequest } from '@src/shared/middleware/validation.middleware';
import { Permission } from '@src/shared/config/permissions';
import { BackupController } from '@src/domains/Backup/controllers/V1/backup.controller';
import { createBackupValidator } from '@src/domains/Backup/validators/V1';

const router: IRouter = Router();

// All routes require authentication
router.use(authenticateToken);

// Create backup - Admin only
router.post(
  '/create',
  requireAdmin,
  requirePermission(Permission.BACKUP_CREATE),
  ...validateRequest(createBackupValidator),
  BackupController.createBackup
);

export default router;
