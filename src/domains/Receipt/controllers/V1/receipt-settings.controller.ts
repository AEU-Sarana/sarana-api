import { Request, Response } from 'express';
import { ReceiptSettingService } from '@src/domains/Receipt/services/V1/receipt-settings.service';
import { logger } from '@src/shared/utils/logger';

export class ReceiptSettingsController {
  static async getSettings(_req: Request, res: Response): Promise<void> {
    try {
      const data = await ReceiptSettingService.getSettings();

      res.status(200).json({
        success: true,
        data,
        message: 'Receipt settings retrieved successfully',
      });
    } catch (error: any) {
      logger.error('Get receipt settings error', { error: error.message });
      throw error;
    }
  }

  static async updateSettings(req: Request, res: Response): Promise<void> {
    try {
      const user = req.user as { userId: number };
      const data = await ReceiptSettingService.updateSettings(req.body, user.userId);

      res.status(200).json({
        success: true,
        data,
        message: 'Receipt settings updated successfully',
      });
    } catch (error: any) {
      logger.error('Update receipt settings error', { error: error.message });
      throw error;
    }
  }
  static async uploadLogo(req: Request, res: Response): Promise<void> {
    try {
      if (!req.file) {
        throw new Error('No file uploaded');
      }

      const user = req.user as { userId: number };
      const data = await ReceiptSettingService.uploadLogo(req.file, user.userId);

      res.status(200).json({
        success: true,
        data,
        message: 'Logo uploaded successfully',
      });
    } catch (error: any) {
      logger.error('Upload receipt logo error', { error: error.message });
      throw error;
    }
  }
}