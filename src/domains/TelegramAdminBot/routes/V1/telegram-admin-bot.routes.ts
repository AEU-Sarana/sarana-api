import { Router, type IRouter } from 'express';
import { TelegramAdminBotController } from '@src/domains/TelegramAdminBot/controllers/V1/telegram-admin-bot.controller';
import { validateRequest } from '@src/shared/middleware/validation.middleware';
import { telegramWebhookValidator } from '@src/domains/TelegramAdminBot/validators/V1/webhook.validator';

const router: IRouter = Router();

router.post(
  '/webhook',
  ...validateRequest(telegramWebhookValidator),
  TelegramAdminBotController.webhook
);

export default router;
