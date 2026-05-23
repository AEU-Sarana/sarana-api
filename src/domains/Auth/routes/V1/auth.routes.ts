import { Router, type IRouter } from 'express';
import { AuthController } from '@src/domains/Auth/controllers/V1/auth.controller';
import { authenticateToken } from '@src/shared/middleware/auth.middleware';
import { authRateLimiter } from '@src/shared/middleware/rate-limit.middleware';
import { validateRequest } from '@src/shared/middleware/validation.middleware';
import { productImageUploadAny } from '@src/shared/utils/multer.config';
import {
  loginValidator,
  logoutValidator,
  refreshTokenValidator,
  forgotPasswordValidator,
  verifyOtpResetPasswordValidator,
  changePasswordValidator,
  resetPasswordValidator,
  updateProfileValidator,
} from '@src/domains/Auth/validators/V1/index';

const router: IRouter = Router();

// POST /api/v1/auth/login
router.post(
  '/login',
  authRateLimiter,
  ...validateRequest(loginValidator),
  AuthController.login
);

// POST /api/v1/auth/forgot-password
router.post(
  '/forgot-password',
  authRateLimiter,
  ...validateRequest(forgotPasswordValidator),
  AuthController.requestPasswordReset
);

// POST /api/v1/auth/verify-otp-reset-password
router.post(
  '/verify-otp-reset-password',
  authRateLimiter,
  ...validateRequest(verifyOtpResetPasswordValidator),
  AuthController.verifyOtpResetPassword
);

// POST /api/v1/auth/logout
router.post(
  '/logout',
  authenticateToken,
  ...validateRequest(logoutValidator),
  AuthController.logout
);

// POST /api/v1/auth/refresh
router.post(
  '/refresh',
  ...validateRequest(refreshTokenValidator),
  AuthController.refreshToken
);

// Backward-compatible alias for existing v1 clients.
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

// PUT /api/v1/auth/profile
router.put(
  '/profile',
  authenticateToken,
  productImageUploadAny,
  ...validateRequest(updateProfileValidator),
  AuthController.updateProfile
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
  authRateLimiter,
  ...validateRequest(resetPasswordValidator),
  AuthController.resetPassword
);

export default router;
