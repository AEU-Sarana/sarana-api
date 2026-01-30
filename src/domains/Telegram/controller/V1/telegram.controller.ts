import { Request, Response } from 'express';
import { TelegramService } from '@src/domains/Telegram/services/telegram.service';
import { logger } from '@src/shared/utils/logger';
import { UserPayload } from '@src/shared/middleware/auth.middleware';
import { SendReportResponse, TelegramConfigResponse, TestConnectionResponse } from '../../types/telegram.types';

export class TelegramController {
  // POST /api/v1/telegram/config
  static async configTelegram(req: Request, res: Response): Promise<void> {
    try {
      const { bot_token, group_chat_id, is_active } = req.body;
      const user = req.user as UserPayload;
      const userId = user.userId;
      
      const response: TelegramConfigResponse = await TelegramService.configureTelegram(
        { bot_token, group_chat_id, is_active },
        userId
      );
      
      res.json({
        success: true,
        data: response,
        message: 'Telegram config updated'
      });
    } catch (error: any) {
      logger.error('Configure Telegram error', { error: error.message });
      res.status(500).json({
        success: false,
        error: {
          code: 'TELEGRAM_CONFIG_ERROR',
          message: 'Failed to configure Telegram'
        }
      });
    }
  }
  
  // POST /api/v1/telegram/test
  static async testConnection(req: Request, res: Response): Promise<void> {
    try {
      const { bot_token, group_chat_id } = req.body;
      
      const response: TestConnectionResponse = await TelegramService.testConnection(
        bot_token,
        group_chat_id
      );
      
      res.json({
        success: true,
        data: response,
        message: 'Telegram connection tested'
      });
    } catch (error: any) {
      logger.error('Test Telegram connection error', { error: error.message });
      res.status(400).json({
        success: false,
        error: {
          code: 'TELEGRAM_TEST_FAILED',
          message: 'Failed to test Telegram connection',
          details: error.message
        }
      });
    }
  }
  
  // POST /api/v1/telegram/send-report
  static async sendReport(req: Request, res: Response): Promise<void> {
    try {
      const { shift_id } = req.body;
      const user = req.user as UserPayload;

      const response: SendReportResponse = await TelegramService.sendDailyReport(
        shift_id,
        user.userId,
        user.role
      );
      
      res.json({
        success: true,
        data: response,
        message: 'Report sent to Telegram'
      });
    } catch (error: any) {
      logger.error('Send Telegram report error', { error: error.message });
      res.status(500).json({
        success: false,
        error: {
          code: 'TELEGRAM_SEND_ERROR',
          message: 'Failed to send report to Telegram',
          details: error.message
        }
      });
    }
  }
  
  // POST /api/v1/telegram/resend-report
  static async resendReport(req: Request, res: Response): Promise<void> {
    try {
      const { shift_id } = req.body;
      const user = req.user as UserPayload;
      
      const response: SendReportResponse = await TelegramService.resendReport(
        shift_id,
        user.userId,
        user.role
      );
      
      res.json({
        success: true,
        data: response,
        message: 'Report resent to Telegram'
      });
    } catch (error: any) {
      logger.error('Resend Telegram report error', { error: error.message });
      res.status(500).json({
        success: false,
        error: {
          code: 'TELEGRAM_RESEND_ERROR',
          message: 'Failed to resend report to Telegram',
          details: error.message
        }
      });
    }
  }
}
