import { Request, Response } from 'express';
import { TelegramService } from '@src/domains/Telegram/services/telegram.service';
import { logger } from '@src/shared/utils/logger';
import { BusinessLogicException } from '@src/shared/exceptions';
import { UserPayload } from '@src/shared/middleware/auth.middleware';
import { SendReportResponse, TelegramConfigResponse, TestConnectionResponse } from '../../types/telegram.types';

export class TelegramController {
  // POST /api/v1/telegram/config
  static async configTelegram(req: Request, res: Response): Promise<void> {
    try {
      const { bot_token, group_chat_id, is_active } = req.body;
      const user = req.user as UserPayload;
      const response: TelegramConfigResponse = await TelegramService.configureTelegram(
        { bot_token, group_chat_id, is_active },
        user.userId
      );

      try {
        await TelegramService.sendCustomMessage(
          'Telegram configured successfully',
          'Markdown'
        );
      } catch (sendError: any) {
        logger.warn('Telegram config saved but test message failed', {
          error: sendError.message,
        });
      }

      res.json({
        success: true,
        data: response,
        message: 'Telegram config updated'
      });
    } catch (error: any) {
      logger.error('Configure Telegram error', { error: error.message });
      throw new BusinessLogicException(
        'Failed to configure Telegram',
        'TELEGRAM_CONFIG_ERROR',
        500,
        { reason: error.message }
      );
    }
  }

  // POST /api/v1/telegram/test
  static async testConnection(req: Request, res: Response): Promise<void> {
    try {
      const { bot_token, group_chat_id } = req.body;

      const response: TestConnectionResponse = await TelegramService.testConnection(
        undefined,
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
      throw new BusinessLogicException(
        'Failed to test Telegram connection',
        'TELEGRAM_TEST_FAILED',
        400,
        { reason: error.message }
      );
    }
  }

  // POST /api/v1/telegram/send-test-message
  static async sendTestMessage(req: Request, res: Response): Promise<void> {
    try {
      const { message, parse_mode } = req.body;
      const text = message?.trim() || '✅ Telegram test message';

      await TelegramService.sendCustomMessage(text, parse_mode);

      res.json({
        success: true,
        message: 'Test message sent to Telegram'
      });
    } catch (error: any) {
      logger.error('Send Telegram test message error', { error: error.message });
      throw new BusinessLogicException(
        'Failed to send test message',
        'TELEGRAM_SEND_TEST_FAILED',
        500,
        { reason: error.message }
      );
    }
  }

  // POST /api/v1/telegram/send-report
  static async sendReport(req: Request, res: Response): Promise<void> {
    try {
      const user = req.user as UserPayload;
      const today = new Date().toISOString().slice(0, 10);
      const response: SendReportResponse = await TelegramService.sendDailyAggregateReport(
        today,
        user.userId
      );

      res.json({
        success: true,
        data: response,
        message: 'Report sent to Telegram Successfully'
      });
    } catch (error: any) {
      logger.error('Send Telegram report error', { error: error.message });
      throw new BusinessLogicException(
        'Failed to send report to Telegram',
        'TELEGRAM_SEND_ERROR',
        500,
        { reason: error.message }
      );
    }
  }

  // GET /api/v1/telegram/config
  static async getTelegramConfig(req: Request, res: Response): Promise<void> {
    try {
      const response = await TelegramService.getTelegramConfig();
      if (!response) {
        res.json({
          success: true,
          data: null,
          message: 'No Telegram configuration found'
        });
        return;
      }
      
      const maskedToken = response.bot_token
        ? response.bot_token.substring(0, 6) + '••••••••' + response.bot_token.substring(response.bot_token.length - 4)
        : '';

      res.json({
        success: true,
        data: {
          config_id: response.config_id,
          bot_token: maskedToken,
          has_token: !!response.bot_token,
          group_chat_id: response.group_chat_id,
          is_active: response.is_active,
          last_test_time: response.last_test_time,
          last_test_status: response.last_test_status
        },
        message: 'Telegram config retrieved'
      });
    } catch (error: any) {
      logger.error('Get Telegram config error', { error: error.message });
      throw new BusinessLogicException(
        'Failed to retrieve Telegram configuration',
        'TELEGRAM_FETCH_ERROR',
        500,
        { reason: error.message }
      );
    }
  }
}
