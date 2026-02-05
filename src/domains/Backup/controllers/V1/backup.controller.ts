import { Request, Response } from 'express';
import { BackupService } from '@src/domains/Backup/services/backup.service';
import { CreateBackupRequest } from '@src/domains/Backup/types';
import { UserPayload } from '@src/shared/middleware/auth.middleware';
import { logger } from '@src/shared/utils/logger';

export class BackupController {
  /**
   * POST /api/v1/backup/create
   */
  static async createBackup(req: Request, res: Response): Promise<void> {
    try {
      const user = req.user as UserPayload;
      const request: CreateBackupRequest = req.body;
      const response = await BackupService.createBackup(request, user.userId);

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
}
