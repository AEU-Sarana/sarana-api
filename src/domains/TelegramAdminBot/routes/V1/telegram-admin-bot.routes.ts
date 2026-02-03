import { Router } from 'express';
import { TelegramAdminBotController } from '@src/domains/TelegramAdminBot/controllers/V1/telegram-admin-bot.controller';

const router = Router();

router.post('/webhook', TelegramAdminBotController.webhook);

export default router;