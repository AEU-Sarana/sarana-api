import { Router, type IRouter } from 'express';
import { TelegramAdminBotController } from '@src/domains/TelegramAdminBot/controllers/V1/telegram-admin-bot.controller';
import { validateRequest } from '@src/shared/middleware/validation.middleware';
import { telegramWebhookValidator } from '@src/domains/TelegramAdminBot/validators/V1/webhook.validator';
import { authenticateToken } from '@src/shared/middleware/auth.middleware';
import { requireAdmin } from '@src/shared/middleware/authorization.middleware';

const router: IRouter = Router();

router.post(
  '/webhook',
  ...validateRequest(telegramWebhookValidator),
  TelegramAdminBotController.webhook
);

router.use(authenticateToken);
router.use(requireAdmin);

router.post(
  '/link',
  authenticateToken,
  requireAdmin,
  TelegramAdminBotController.createLink
);

export default router;
