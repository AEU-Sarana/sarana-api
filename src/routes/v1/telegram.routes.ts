import { Router, type IRouter } from 'express';
import telegramRoutes from '@src/domains/Telegram/routes/V1/telegram.routes';

const router: IRouter = Router();

router.use('/', telegramRoutes);

export default router;