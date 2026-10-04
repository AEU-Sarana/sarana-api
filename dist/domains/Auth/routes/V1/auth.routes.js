"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_controller_1 = require("../../../../domains/Auth/controllers/V1/auth.controller");
const auth_middleware_1 = require("../../../../shared/middleware/auth.middleware");
const rate_limit_middleware_1 = require("../../../../shared/middleware/rate-limit.middleware");
const validation_middleware_1 = require("../../../../shared/middleware/validation.middleware");
const multer_config_1 = require("../../../../shared/utils/multer.config");
const index_1 = require("../../../../domains/Auth/validators/V1/index");
const router = (0, express_1.Router)();
// POST /api/v1/auth/login
router.post('/login', rate_limit_middleware_1.authRateLimiter, ...(0, validation_middleware_1.validateRequest)(index_1.loginValidator), auth_controller_1.AuthController.login);
// POST /api/v1/auth/forgot-password
router.post('/forgot-password', rate_limit_middleware_1.authRateLimiter, ...(0, validation_middleware_1.validateRequest)(index_1.forgotPasswordValidator), auth_controller_1.AuthController.requestPasswordReset);
// POST /api/v1/auth/verify-otp-reset-password
router.post('/verify-otp-reset-password', rate_limit_middleware_1.authRateLimiter, ...(0, validation_middleware_1.validateRequest)(index_1.verifyOtpResetPasswordValidator), auth_controller_1.AuthController.verifyOtpResetPassword);
// POST /api/v1/auth/logout
router.post('/logout', auth_middleware_1.authenticateToken, ...(0, validation_middleware_1.validateRequest)(index_1.logoutValidator), auth_controller_1.AuthController.logout);
// POST /api/v1/auth/refresh
router.post('/refresh', ...(0, validation_middleware_1.validateRequest)(index_1.refreshTokenValidator), auth_controller_1.AuthController.refreshToken);
// Backward-compatible alias for existing v1 clients.
router.post('/refresh-token', ...(0, validation_middleware_1.validateRequest)(index_1.refreshTokenValidator), auth_controller_1.AuthController.refreshToken);
// GET /api/v1/auth/me
router.get('/me', auth_middleware_1.authenticateToken, auth_controller_1.AuthController.getCurrentUser);
// PUT /api/v1/auth/profile
router.put('/profile', auth_middleware_1.authenticateToken, multer_config_1.productImageUploadAny, ...(0, validation_middleware_1.validateRequest)(index_1.updateProfileValidator), auth_controller_1.AuthController.updateProfile);
// POST /api/v1/auth/change-password
router.post('/change-password', auth_middleware_1.authenticateToken, ...(0, validation_middleware_1.validateRequest)(index_1.changePasswordValidator), auth_controller_1.AuthController.changePassword);
// POST /api/v1/auth/reset-password (Admin only)
router.post('/reset-password', rate_limit_middleware_1.authRateLimiter, ...(0, validation_middleware_1.validateRequest)(index_1.resetPasswordValidator), auth_controller_1.AuthController.resetPassword);
exports.default = router;
//# sourceMappingURL=auth.routes.js.map