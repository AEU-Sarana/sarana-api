"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_middleware_1 = require("../../../../shared/middleware/auth.middleware");
const authorization_middleware_1 = require("../../../../shared/middleware/authorization.middleware");
const validation_middleware_1 = require("../../../../shared/middleware/validation.middleware");
const permissions_1 = require("../../../../shared/config/permissions");
const backup_controller_1 = require("../../../../domains/Backup/controllers/V1/backup.controller");
const V1_1 = require("../../../../domains/Backup/validators/V1");
const router = (0, express_1.Router)();
// All routes require authentication
router.use(auth_middleware_1.authenticateToken);
// List backups - Admin only
router.get('/list', authorization_middleware_1.requireAdmin, (0, authorization_middleware_1.requirePermission)(permissions_1.Permission.BACKUP_LIST), ...(0, validation_middleware_1.validateRequest)(V1_1.listBackupsValidator), backup_controller_1.BackupController.listBackups);
// Create backup - Admin only
router.post('/create', authorization_middleware_1.requireAdmin, (0, authorization_middleware_1.requirePermission)(permissions_1.Permission.BACKUP_CREATE), ...(0, validation_middleware_1.validateRequest)(V1_1.createBackupValidator), backup_controller_1.BackupController.createBackup);
// Restore backup - Admin only
router.post('/restore', authorization_middleware_1.requireAdmin, (0, authorization_middleware_1.requirePermission)(permissions_1.Permission.BACKUP_RESTORE), ...(0, validation_middleware_1.validateRequest)(V1_1.restoreBackupValidator), backup_controller_1.BackupController.restoreBackup);
// Export data - Admin only
router.get('/export', authorization_middleware_1.requireAdmin, (0, authorization_middleware_1.requirePermission)(permissions_1.Permission.BACKUP_EXPORT), ...(0, validation_middleware_1.validateRequest)(V1_1.exportDataValidator), backup_controller_1.BackupController.exportData);
// Download backup point - Admin only
router.get('/download/:id', authorization_middleware_1.requireAdmin, (0, authorization_middleware_1.requirePermission)(permissions_1.Permission.BACKUP_EXPORT), backup_controller_1.BackupController.downloadBackup);
exports.default = router;
//# sourceMappingURL=backup.routes.js.map