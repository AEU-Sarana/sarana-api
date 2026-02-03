import { Request, Response } from 'express';
import { TelegramAdminBotService } from '@src/domains/TelegramAdminBot/services/telegram-admin-bot.service';
import { logger } from '@src/shared/utils/logger';

export class TelegramAdminBotController {

  // POST /api/v1/telegram-admin-bot/webhook
  static async webhook(req: Request, res: Response): Promise<void> {
    try {
      const result = await TelegramAdminBotService.handleUpdate(req.body);
      res.status(200).json({ success: true, data: result });
    } catch (error: any) {
      logger.error('Telegram admin bot webhook error', { error: error.message });
      res.status(400).json({
        success: false,
        error: { code: 'TELEGRAM_ADMIN_BOT_ERROR', message: error.message }
      });
    }
  }
  
}