import { Router,type IRouter} from 'express';
import { TelegramAdminBotController } from '@src/domains/TelegramAdminBot/controllers/V1/telegram-admin-bot.controller';

const router: IRouter = Router();

router.post('/webhook', TelegramAdminBotController.webhook);

export default router;