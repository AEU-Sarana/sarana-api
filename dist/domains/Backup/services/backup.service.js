"use strict";
// File: src/domains/Backup/services/backup.service.ts
Object.defineProperty(exports, "__esModule", { value: true });
exports.BackupService = void 0;
const backup_create_service_1 = require("./backup-create.service");
const backup_restore_service_1 = require("./backup-restore.service");
const backup_export_service_1 = require("./backup-export.service");
const audit_log_service_1 = require("../../../shared/services/audit-log.service");
const event_bus_1 = require("../../../shared/events/event-bus");
const enums_1 = require("../../../domains/Backup/enums");
class BackupService {
    static async createBackup(req) {
        const runType = req.triggered_by === 'auto' ? enums_1.BackupRunType.AUTO : enums_1.BackupRunType.MANUAL;
        try {
            const data = await backup_create_service_1.BackupCreateService.createBackup(req);
            await audit_log_service_1.auditLogService.createAuditLog({
                action: 'BACKUP_CREATE',
                resource: 'backup',
                details: { backup_name: req.backup_name, include_data: req.include_data, run_type: runType },
            });
            event_bus_1.eventBus.emit('backup.created', {
                backup_id: data.backup_id,
                backup_name: data.backup_name,
                file_size: data.file_size,
                created_at: data.created_at,
                run_type: runType,
                status: enums_1.BackupRunStatus.SUCCESS,
            });
            return data;
        }
        catch (error) {
            event_bus_1.eventBus.emit('backup.failed', {
                run_type: enums_1.BackupRunType.MANUAL,
                status: enums_1.BackupRunStatus.FAILED,
                error_code: 'BACKUP_CREATE_ERROR',
                error_message: error.message,
                occurred_at: new Date(),
            });
            throw error;
        }
    }
    static async listBackups(page = 1, limit = 20) {
        try {
            const data = await backup_create_service_1.BackupCreateService.listBackups(page, limit);
            await audit_log_service_1.auditLogService.createAuditLog({
                action: 'BACKUP_LIST',
                resource: 'backup',
                details: { page, limit },
            });
            return data;
        }
        catch (error) {
            throw error;
        }
    }
    static async restoreBackup(req) {
        try {
            const data = await backup_restore_service_1.BackupRestoreService.restoreBackup(req);
            await audit_log_service_1.auditLogService.createAuditLog({
                action: 'BACKUP_RESTORE',
                resource: 'backup',
                details: { backup_id: req.backup_id },
            });
            event_bus_1.eventBus.emit('backup.restored', {
                backup_id: req.backup_id,
                restored_at: data.restored_at,
                run_type: enums_1.BackupRunType.RESTORE,
                status: enums_1.BackupRunStatus.SUCCESS,
            });
            return data;
        }
        catch (error) {
            event_bus_1.eventBus.emit('backup.failed', {
                run_type: enums_1.BackupRunType.RESTORE,
                status: enums_1.BackupRunStatus.FAILED,
                error_code: 'BACKUP_RESTORE_ERROR',
                error_message: error.message,
                occurred_at: new Date(),
            });
            throw error;
        }
    }
    static async exportData(format, table, query) {
        try {
            const normalizedFormat = format.toUpperCase();
            const data = await backup_export_service_1.BackupExportService.exportData(normalizedFormat, table, query);
            await audit_log_service_1.auditLogService.createAuditLog({
                action: 'BACKUP_EXPORT',
                resource: 'backup',
                details: { format: normalizedFormat, table },
            });
            event_bus_1.eventBus.emit('backup.exported', {
                table,
                format: normalizedFormat,
                file_name: data.file_name,
                file_url: data.file_url,
                expires_at: data.expires_at,
                status: enums_1.BackupRunStatus.SUCCESS,
            });
            return data;
        }
        catch (error) {
            event_bus_1.eventBus.emit('backup.failed', {
                run_type: enums_1.BackupRunType.MANUAL,
                status: enums_1.BackupRunStatus.FAILED,
                error_code: 'BACKUP_EXPORT_ERROR',
                error_message: error.message,
                occurred_at: new Date(),
            });
            throw error;
        }
    }
    static async downloadBackup(backupId) {
        try {
            const data = await backup_restore_service_1.BackupRestoreService.downloadBackup(backupId);
            await audit_log_service_1.auditLogService.createAuditLog({
                action: 'BACKUP_EXPORT',
                resource: 'backup',
                details: { backup_id: backupId, action: 'download' },
            });
            return data;
        }
        catch (error) {
            throw error;
        }
    }
}
exports.BackupService = BackupService;
//# sourceMappingURL=backup.service.js.map