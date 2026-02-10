import { Request, Response } from 'express';
import { TelegramAdminBotService } from '@src/domains/TelegramAdminBot/services/telegram-admin-bot.service';
import { logger } from '@src/shared/utils/logger';
import { CreateTelegramAdminLinkRequest } from '../../types/telegram-admin-bot.types';
import { UserPayload } from '@src/shared/middleware/auth.middleware';

export class TelegramAdminBotController {

  // POST /api/v1/telegram-admin-bot/webhook
  static async webhook(req: Request, res: Response): Promise<void> {
    const payload = req.body;
    res.status(200).json({ success: true });

    setImmediate(async () => {
      try {
        await TelegramAdminBotService.handleUpdate(payload);
      } catch (error: any) {
        logger.error('Telegram admin bot webhook error', { error: error.message });
      }
    });
  }

  static async createLink(req: Request, res: Response) {
    const payload = req.body as CreateTelegramAdminLinkRequest;
    const user = req.user as UserPayload;
    const requestedByUserId = user.userId;

    const data = await TelegramAdminBotService.createLinkCode(
      payload,
      requestedByUserId
    );

    return res.status(200).json({
      success: true,
      data,
      message: 'Admin link code created'
    });
  }

  // POST /api/v1/telegram-admin-bot/setup-webhook
  static async setupWebhook(req: Request, res: Response): Promise<void> {
    try {
      const { webhook_url, regenerate_secret } = req.body;

      if (!webhook_url) {
        return res.status(400).json({
          success: false,
          message: 'webhook_url is required'
        });
      }

      const result = await TelegramAdminBotService.setupWebhook({
        webhookUrl: webhook_url,
        regenerateSecret: regenerate_secret ?? false
      });

      res.status(200).json({
        success: true,
        data: result,
        message: 'Webhook configured successfully'
      });
    } catch (error: any) {
      logger.error('Setup webhook error', { error: error.message });
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to setup webhook'
      });
    }
  }

}
