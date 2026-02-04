import { Router, type IRouter } from 'express';
import telegramAdminBotRoute from '@src/domains/TelegramAdminBot/routes/V1/telegram-admin-bot.routes';


const router: IRouter = Router();

router.use('/', telegramAdminBotRoute);

export default router;