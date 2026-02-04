import { Router,type IRouter} from 'express';
import { TelegramAdminBotController } from '@src/domains/TelegramAdminBot/controllers/V1/telegram-admin-bot.controller';
import { authenticateToken } from '@src/shared/middleware/auth.middleware';
import { requireAdmin } from '@src/shared/middleware/authorization.middleware';

const router: IRouter = Router();

router.post('/webhook', TelegramAdminBotController.webhook);

router.use(authenticateToken);
router.use(requireAdmin);

router.post(
  '/link',
  authenticateToken,
  requireAdmin,
  TelegramAdminBotController.createLink
);

export default router;