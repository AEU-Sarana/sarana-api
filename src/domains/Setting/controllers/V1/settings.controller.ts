import { Request, Response } from 'express';
import { SettingService } from '@src/domains/Setting/services/setting.service';
import { UpdateSettingsRequest } from '@src/domains/Setting/types';
import { UserPayload } from '@src/shared/middleware/auth.middleware';
import { logger } from '@src/shared/utils/logger';

export class SettingsController {
  /**
   * GET /api/v1/settings
   * Get application settings
   */
  static async getSettings(req: Request, res: Response): Promise<void> {
    try {
      const user = req.user as UserPayload;
      const response = await SettingService.getSettings(user.userId);

      res.status(200).json({
        success: true,
        data: response,
        message: 'Settings retrieved successfully',
      });
    } catch (error: any) {
      logger.error('Get settings error', { error: error.message });
      throw error;
    }
  }

  /**
   * PUT /api/v1/settings
   * Update application settings
   */
  static async updateSettings(req: Request, res: Response): Promise<void> {
    try {
      const user = req.user as UserPayload;
      const request: UpdateSettingsRequest = req.body;
      const response = await SettingService.updateSettings(
        request,
        user.userId
      );

      res.status(200).json({
        success: true,
        data: response,
        message: 'Settings updated successfully',
      });
    } catch (error: any) {
      logger.error('Update settings error', { error: error.message });
      throw error;
    }
  }
}
