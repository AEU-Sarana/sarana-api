import { Router, type IRouter } from 'express';
import { authenticateToken } from '@src/shared/middleware/auth.middleware';
import { requireAdmin } from '@src/shared/middleware/authorization.middleware';
import { validateRequest } from '@src/shared/middleware/validation.middleware';
import { TelegramController } from '../../controller/V1/telegram.controller';

import {
  configTelegramValidator,
  testTelegramValidator,
  sendReportValidator,
  resendReportValidator,
} from '@src/domains/Telegram/validators/V1/index';
import { sendTestMessageValidator } from '@src/domains/Telegram/validators/V1/send-test-message.validator';


const router: IRouter = Router();

// All routes require authentication and admin role
router.use(authenticateToken);
router.use(requireAdmin);

// POST /api/v1/telegram/config
router.post(
  '/config',
  ...validateRequest(configTelegramValidator),
  TelegramController.configTelegram
);

// POST /api/v1/telegram/test
router.post(
  '/test',
  ...validateRequest(testTelegramValidator),
  TelegramController.testConnection
);

// POST /api/v1/telegram/send-report
router.post(
  '/send-report',
  ...validateRequest(sendReportValidator),
  TelegramController.sendReport
);

// POST /api/v1/telegram/resend-report
router.post(
  '/resend-report',
  ...validateRequest(resendReportValidator),
  TelegramController.resendReport
);

router.post(
  '/send-test-message',
  ...validateRequest(sendTestMessageValidator),
  TelegramController.sendTestMessage
)

export default router;