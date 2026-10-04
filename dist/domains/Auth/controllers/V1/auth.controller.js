"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthController = void 0;
const auth_service_1 = require("../../../../domains/Auth/services/V1/auth.service");
const logger_1 = require("../../../../shared/utils/logger");
const sessionService = new auth_service_1.AuthService();
class AuthController {
    /**
     * POST /api/v1/auth/login
     */
    static async login(req, res) {
        try {
            const response = await sessionService.login({
                ...req.body,
                ip: req.ip,
                user_agent: req.headers['user-agent'],
            });
            res.status(200).json({
                success: true,
                data: response,
                message: 'Login successful',
            });
        }
        catch (error) {
            logger_1.logger.error('Login error', { error: error.message });
            throw error; // Let error middleware handle it
        }
    }
    /**
     * POST /api/v1/auth/logout
     */
    static async logout(req, res) {
        try {
            const response = await sessionService.logout(req.body);
            res.status(200).json({
                success: true,
                data: response,
                message: 'Logout successful',
            });
        }
        catch (error) {
            logger_1.logger.error('Logout error', { error: error.message });
            throw error;
        }
    }
    /**
     * POST /api/v1/auth/refresh
     */
    static async refreshToken(req, res) {
        try {
            const response = await sessionService.refresh({
                ...req.body,
                refresh_token: req.body.refresh_token || req.body.refreshToken,
                ip: req.ip,
                user_agent: req.headers['user-agent'],
            });
            res.status(200).json({
                success: true,
                data: response,
                message: 'Token refreshed successfully',
            });
        }
        catch (error) {
            logger_1.logger.error('Refresh token error', { error: error.message });
            throw error;
        }
    }
    /**
     * GET /api/v1/auth/me
     */
    static async getCurrentUser(req, res) {
        try {
            const user = req.user;
            if (!user) {
                res.status(401).json({
                    success: false,
                    message: 'Unauthorized',
                    code: 'UNAUTHORIZED',
                });
                return;
            }
            if (typeof user.userId !== 'number') {
                res.status(401).json({
                    success: false,
                    message: 'Unauthorized',
                    code: 'UNAUTHORIZED',
                });
                return;
            }
            const userData = await sessionService.me(user.userId);
            res.status(200).json({
                success: true,
                data: userData,
                message: 'Current user retrieved',
            });
        }
        catch (error) {
            logger_1.logger.error('Get current user error', { error: error.message });
            throw error;
        }
    }
    /**
     * PUT /api/v1/auth/profile
     */
    static async updateProfile(req, res) {
        try {
            const user = req.user;
            // req.body can be undefined when multer processes a non-multipart request
            // (e.g. a plain JSON PUT with no file). Default to empty object to avoid crash.
            const request = req.body ?? {};
            const imageFile = req.file;
            await sessionService.updateProfile(user.userId, request, imageFile);
            res.status(200).json({
                success: true,
                data: {},
                message: 'Profile updated successfully',
            });
        }
        catch (error) {
            logger_1.logger.error('Update profile error', { error: error.message });
            throw error;
        }
    }
    /**
     * POST /api/v1/auth/change-password
     */
    static async changePassword(req, res) {
        try {
            const user = req.user;
            const request = req.body;
            await sessionService.changePassword(user.userId, request);
            res.status(200).json({
                success: true,
                data: {},
                message: 'Password changed successfully',
            });
        }
        catch (error) {
            logger_1.logger.error('Change password error', { error: error.message });
            throw error;
        }
    }
    /**
     * POST /api/v1/auth/reset-password-request
     */
    static async requestPasswordReset(req, res) {
        try {
            const { username, email } = req.body;
            const identifier = username || email;
            // Don't reveal if user exists (security)
            await sessionService.requestPasswordReset(identifier);
            res.status(200).json({
                success: true,
                message: 'If the identifier exists, a password reset email has been sent',
            });
        }
        catch (error) {
            logger_1.logger.error('Request password reset error', { error: error.message });
            throw error;
        }
    }
    /**
     * POST /api/v1/auth/reset-password (Admin only)
     */
    static async resetPassword(req, res) {
        try {
            const request = req.body;
            const adminUser = req.user;
            const identifier = request.username || request.email || request.user_id;
            await sessionService.resetPassword(identifier, request.new_password, adminUser?.userId || 0);
            res.status(200).json({
                success: true,
                data: {},
                message: 'Password reset successful',
            });
        }
        catch (error) {
            logger_1.logger.error('Reset password error', { error: error.message });
            throw error;
        }
    }
    /**
     * POST /api/v1/auth/verify-otp-reset-password
     */
    static async verifyOtpResetPassword(req, res) {
        try {
            const { email, username, otp_code } = req.body;
            const identifier = username || email;
            await sessionService.verifyOtp({
                identifier,
                otpCode: otp_code,
            });
            res.status(200).json({
                success: true,
                message: 'OTP verified successfully. You can now reset your password.',
            });
        }
        catch (error) {
            logger_1.logger.error('Verify OTP reset password error', { error: error.message });
            throw error;
        }
    }
}
exports.AuthController = AuthController;
//# sourceMappingURL=auth.controller.js.map