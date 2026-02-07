import { Router } from 'express';
import { authenticateToken } from '@src/shared/middleware/auth.middleware';
import { validateRequest } from '@src/shared/middleware/validation.middleware';
import { AuthV2Controller } from '@src/domains/Auth/controllers/V2/auth.controller';
import {
  loginValidator,
  refreshValidator,
  logoutValidator,
} from '@src/domains/Auth/validators/V2';

const router = Router();
const controller = new AuthV2Controller();

router.post('/login', ...validateRequest(loginValidator), controller.login.bind(controller));
router.post('/refresh', ...validateRequest(refreshValidator), controller.refresh.bind(controller));

// Decision: logout requires refresh_token in body for exact session revoke.
router.post('/logout', authenticateToken, ...validateRequest(logoutValidator), controller.logout.bind(controller));

router.post('/logout-all', authenticateToken, controller.logoutAll.bind(controller));
router.get('/me', authenticateToken, controller.me.bind(controller));

export default router;
