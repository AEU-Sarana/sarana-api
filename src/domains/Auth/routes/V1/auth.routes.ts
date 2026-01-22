import { Router, type IRouter } from 'express';
import { AuthController } from '@src/domains/Auth/controllers/V1/auth.controller';
import { authenticateToken } from '@src/shared/middleware/auth.middleware';
import { requirePermission } from '@src/shared/middleware/authorization.middleware';
import { Permission } from '@src/shared/config/permissions';
import { authRateLimiter } from '@src/shared/middleware/rate-limit.middleware';
import { validateRequest } from '@src/shared/middleware/validation.middleware';
import {
  loginValidator,
  logoutValidator,
  refreshTokenValidator,
  changePasswordValidator,
  resetPasswordRequestValidator,
  resetPasswordValidator,
} from '@src/domains/Auth/validators/V1/index';

const router: IRouter = Router();

// POST /api/v1/auth/login
router.post(
  '/login',
  authRateLimiter,
  ...validateRequest(loginValidator),
  AuthController.login
);

// POST /api/v1/auth/reset-password-request
router.post(
  '/reset-password-request',
  authRateLimiter,
  ...validateRequest(resetPasswordRequestValidator),
  AuthController.requestPasswordReset
);

// POST /api/v1/auth/logout
router.post(
  '/logout',
  authenticateToken,
  requirePermission(Permission.AUTH_LOGOUT),
  ...validateRequest(logoutValidator),
  AuthController.logout
);

// POST /api/v1/auth/refresh-token
router.post(
  '/refresh-token',
  ...validateRequest(refreshTokenValidator),
  AuthController.refreshToken
);

// GET /api/v1/auth/me
router.get(
  '/me',
  authenticateToken,
  AuthController.getCurrentUser
);

// POST /api/v1/auth/change-password
router.post(
  '/change-password',
  authenticateToken,
  ...validateRequest(changePasswordValidator),
  AuthController.changePassword
);

// POST /api/v1/auth/reset-password (Admin only)
router.post(
  '/reset-password',
  authenticateToken,
  requirePermission(Permission.AUTH_RESET_PASSWORD),
  ...validateRequest(resetPasswordValidator),
  AuthController.resetPassword
);

export default router;