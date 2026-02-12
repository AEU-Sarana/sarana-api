import { Router, type IRouter } from 'express';
import { authenticateToken } from '@src/shared/middleware/auth.middleware';
import { requireAdmin, requirePermission } from '@src/shared/middleware/authorization.middleware';
import { validateRequest } from '@src/shared/middleware/validation.middleware';
import { Permission } from '@src/shared/config/permissions';
import { BackupController } from '@src/domains/Backup/controllers/V1/backup.controller';
import {
  createBackupValidator,
  exportDataValidator,
  listBackupsValidator,
  restoreBackupValidator,
} from '@src/domains/Backup/validators/V1';

const router: IRouter = Router();

// All routes require authentication
router.use(authenticateToken);

// List backups - Admin only
router.get(
  '/list',
  requireAdmin,
  requirePermission(Permission.BACKUP_LIST),
  ...validateRequest(listBackupsValidator),
  BackupController.listBackups
);

// Create backup - Admin only
router.post(
  '/create',
  requireAdmin,
  requirePermission(Permission.BACKUP_CREATE),
  ...validateRequest(createBackupValidator),
  BackupController.createBackup
);

// Restore backup - Admin only
router.post(
  '/restore',
  requireAdmin,
  requirePermission(Permission.BACKUP_RESTORE),
  ...validateRequest(restoreBackupValidator),
  BackupController.restoreBackup
);

// Export data - Admin only
router.get(
  '/export',
  requireAdmin,
  requirePermission(Permission.BACKUP_EXPORT),
  ...validateRequest(exportDataValidator),
  BackupController.exportData
);

export default router;
