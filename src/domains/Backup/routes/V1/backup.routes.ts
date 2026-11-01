import { Router, type IRouter } from 'express';
import { authenticateToken } from '@src/shared/middleware/auth.middleware';
import { requireAdministrator, requirePermission } from '@src/shared/middleware/authorization.middleware';
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

// List backups - Administrator only
router.get(
  '/list',
  requireAdministrator,
  requirePermission(Permission.BACKUP_LIST),
  ...validateRequest(listBackupsValidator),
  BackupController.listBackups
);

// Create backup - Administrator only
router.post(
  '/create',
  requireAdministrator,
  requirePermission(Permission.BACKUP_CREATE),
  ...validateRequest(createBackupValidator),
  BackupController.createBackup
);

// Restore backup - Administrator only
router.post(
  '/restore',
  requireAdministrator,
  requirePermission(Permission.BACKUP_RESTORE),
  ...validateRequest(restoreBackupValidator),
  BackupController.restoreBackup
);

// Export data - Administrator only
router.get(
  '/export',
  requireAdministrator,
  requirePermission(Permission.BACKUP_EXPORT),
  ...validateRequest(exportDataValidator),
  BackupController.exportData
);

// Download backup point - Administrator only
router.get(
  '/download/:id',
  requireAdministrator,
  requirePermission(Permission.BACKUP_EXPORT),
  BackupController.downloadBackup
);

export default router;
