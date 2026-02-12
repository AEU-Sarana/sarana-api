// File: src/domains/Backup/services/backup.service.ts

import { BackupCreateService } from './backup-create.service';
import { BackupRestoreService } from './backup-restore.service';
import { BackupExportService } from './backup-export.service';
import {
  CreateBackupRequest,
  CreateBackupResponse,
  ListBackupsResponse,
  RestoreBackupRequest,
  RestoreBackupResponse,
  ExportResponse,
  ExportFormat,
} from '../types/backup.types';
import { auditLogService } from '@src/shared/services/audit-log.service';
import { eventBus } from '@src/shared/events/event-bus';
import { BackupExportFormat, BackupRunStatus, BackupRunType } from '@src/domains/Backup/enums';
import {
  BackupCreatedEvent,
  BackupExportedEvent,
  BackupFailedEvent,
  BackupRestoredEvent,
} from '@src/domains/Backup/events';

export class BackupService {
  static async createBackup(req: CreateBackupRequest): Promise<CreateBackupResponse> {
    const runType = req.triggered_by === 'auto' ? BackupRunType.AUTO : BackupRunType.MANUAL;

    try {
      const data = await BackupCreateService.createBackup(req);
      await auditLogService.createAuditLog({
        action: 'BACKUP_CREATE',
        resource: 'backup',
        details: { backup_name: req.backup_name, include_data: req.include_data, run_type: runType },
      });

      eventBus.emit('backup.created', {
        backup_id: data.backup_id,
        backup_name: data.backup_name,
        file_size: data.file_size,
        created_at: data.created_at,
        run_type: runType,
        status: BackupRunStatus.SUCCESS,
      } satisfies BackupCreatedEvent);

      return data;
    } catch (error: any) {
      eventBus.emit('backup.failed', {
        run_type: BackupRunType.MANUAL,
        status: BackupRunStatus.FAILED,
        error_code: 'BACKUP_CREATE_ERROR',
        error_message: error.message,
        occurred_at: new Date(),
      } satisfies BackupFailedEvent);
      throw error;
    }
  }

  static async listBackups(page = 1, limit = 20): Promise<ListBackupsResponse> {
    try {
      const data = await BackupCreateService.listBackups(page, limit);
      await auditLogService.createAuditLog({
        action: 'BACKUP_LIST',
        resource: 'backup',
        details: { page, limit },
      });
      return data;
    } catch (error: any) {
      throw error;
    }
  }

  static async restoreBackup(req: RestoreBackupRequest): Promise<RestoreBackupResponse> {
    try {
      const data = await BackupRestoreService.restoreBackup(req);
      await auditLogService.createAuditLog({
        action: 'BACKUP_RESTORE',
        resource: 'backup',
        details: { backup_id: req.backup_id },
      });

      eventBus.emit('backup.restored', {
        backup_id: req.backup_id,
        restored_at: data.restored_at,
        run_type: BackupRunType.RESTORE,
        status: BackupRunStatus.SUCCESS,
      } satisfies BackupRestoredEvent);

      return data;
    } catch (error: any) {
      eventBus.emit('backup.failed', {
        run_type: BackupRunType.RESTORE,
        status: BackupRunStatus.FAILED,
        error_code: 'BACKUP_RESTORE_ERROR',
        error_message: error.message,
        occurred_at: new Date(),
      } satisfies BackupFailedEvent);
      throw error;
    }
  }

  static async exportData(format: string, table: string, query: any): Promise<ExportResponse> {
    try {
      const normalizedFormat = format.toUpperCase() as ExportFormat;
      const data = await BackupExportService.exportData(normalizedFormat, table, query);
      await auditLogService.createAuditLog({
        action: 'BACKUP_EXPORT',
        resource: 'backup',
        details: { format: normalizedFormat, table },
      });

      eventBus.emit('backup.exported', {
        table,
        format: normalizedFormat as BackupExportFormat,
        file_name: data.file_name,
        file_url: data.file_url,
        expires_at: data.expires_at,
        status: BackupRunStatus.SUCCESS,
      } satisfies BackupExportedEvent);

      return data;
    } catch (error: any) {
      eventBus.emit('backup.failed', {
        run_type: BackupRunType.MANUAL,
        status: BackupRunStatus.FAILED,
        error_code: 'BACKUP_EXPORT_ERROR',
        error_message: error.message,
        occurred_at: new Date(),
      } satisfies BackupFailedEvent);
      throw error;
    }
  }
}
