import { Request, Response } from 'express';
import { BackupService } from '@src/domains/Backup/services/backup.service';
import {
  CreateBackupRequest,
  ListBackupsRequest,
  RestoreBackupRequest,
  ExportResponse,
} from '@src/domains/Backup/types';
import { logger } from '@src/shared/utils/logger';

export class BackupController {
  /**
   * GET /api/v1/backup/list
   */
  static async listBackups(req: Request, res: Response): Promise<void> {
    try {
      const request: ListBackupsRequest = {
        page: req.query.page ? parseInt(req.query.page as string, 10) : 1,
        limit: req.query.limit ? parseInt(req.query.limit as string, 10) : 20,
      };

      const response = await BackupService.listBackups(request.page, request.limit);

      res.status(200).json({
        success: true,
        data: response,
        message: 'Backups retrieved',
      });
    } catch (error: any) {
      logger.error('List backups error', { error: error.message });
      throw error;
    }
  }

  /**
   * POST /api/v1/backup/create
   */
  static async createBackup(req: Request, res: Response): Promise<void> {
    try {
      const request: CreateBackupRequest = req.body;
      const response = await BackupService.createBackup(request);

      res.status(201).json({
        success: true,
        data: response,
        message: 'Backup created',
      });
    } catch (error: any) {
      logger.error('Create backup error', { error: error.message });
      throw error;
    }
  }

  /**
   * POST /api/v1/backup/restore
   */
  static async restoreBackup(req: Request, res: Response): Promise<void> {
    try {
      const request: RestoreBackupRequest = req.body;
      const response = await BackupService.restoreBackup(request);

      res.status(200).json({
        success: true,
        data: response,
        message: 'Backup restored',
      });
    } catch (error: any) {
      logger.error('Restore backup error', { error: error.message });
      throw error;
    }
  }

  /**
   * GET /api/v1/backup/export
   */
  static async exportData(req: Request, res: Response): Promise<void> {
    try {
      const format = ((req.query.format as string) || '').toUpperCase();
      const table = req.query.table as string;
      const response: ExportResponse = await BackupService.exportData(format, table, req.query);

      res.status(200).json({
        success: true,
        data: response,
        message: 'Data exported',
      });
    } catch (error: any) {
      logger.error('Export backup data error', { error: error.message });
      throw error;
    }
  }

  /**
   * GET /api/v1/backup/download/:id
   */
  static async downloadBackup(req: Request, res: Response): Promise<void> {
    try {
      const rawParam = req.params.id;
      const paramStr = Array.isArray(rawParam) ? rawParam[0] : rawParam;
      const rawQuery = req.query.id;
      const queryStr = Array.isArray(rawQuery) ? String(rawQuery[0]) : (rawQuery ? String(rawQuery) : '');
      const backupId = parseInt(paramStr || queryStr, 10);
      if (!backupId || isNaN(backupId)) {
        res.status(400).json({ success: false, message: 'Invalid backup ID' });
        return;
      }

      const { filePath, fileName } = await BackupService.downloadBackup(backupId);

      res.download(filePath, fileName, (err) => {
        if (err) {
          logger.error('Error sending download backup file', { error: err.message });
        }
        try {
          const fs = require('fs');
          if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
          }
        } catch {}
      });
    } catch (error: any) {
      logger.error('Download backup error', { error: error.message });
      res.status(400).json({ success: false, message: error.message || 'Download backup failed' });
    }
  }
}
