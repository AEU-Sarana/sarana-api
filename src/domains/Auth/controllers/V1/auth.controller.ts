import { Request, Response } from 'express';
import { AuthService as LegacyAuthService } from '@src/domains/Auth/services/auth.service';
import { AuthService as AuthSessionService } from '@src/domains/Auth/services/V1/auth.service';
import {
  ChangePasswordRequest,
  ResetPasswordRequest,
  UpdateProfileRequest,
} from '@src/domains/Auth/types/auth.types';
import { UserPayload } from '@src/shared/middleware/auth.middleware';
import { logger } from '@src/shared/utils/logger';

const sessionService = new AuthSessionService();

export class AuthController {
  /**
   * POST /api/v1/auth/login
   */
  static async login(req: Request, res: Response): Promise<void> {
    try {
      const response = await sessionService.login({
        ...req.body,
        ip: req.ip,
        user_agent: req.headers['user-agent'] as string | undefined,
      });

      res.status(200).json({
        success: true,
        data: response,
        message: 'Login successful',
      });
    } catch (error: any) {
      logger.error('Login error', { error: error.message });
      throw error; // Let error middleware handle it
    }
  }

  /**
   * POST /api/v1/auth/logout
   */
  static async logout(req: Request, res: Response): Promise<void> {
    try {
      const response = await sessionService.logout(req.body);

      res.status(200).json({
        success: true,
        data: response,
        message: 'Logout successful',
      });
    } catch (error: any) {
      logger.error('Logout error', { error: error.message });
      throw error;
    }
  }

  /**
   * POST /api/v1/auth/refresh
   */
  static async refreshToken(req: Request, res: Response): Promise<void> {
    try {
      const response = await sessionService.refresh({
        ...req.body,
        refresh_token: req.body.refresh_token || req.body.refreshToken,
        ip: req.ip,
        user_agent: req.headers['user-agent'] as string | undefined,
      });

      res.status(200).json({
        success: true,
        data: response,
        message: 'Token refreshed successfully',
      });
    } catch (error: any) {
      logger.error('Refresh token error', { error: error.message });
      throw error;
    }
  }

  /**
   * GET /api/v1/auth/me
   */
  static async getCurrentUser(req: Request, res: Response): Promise<void> {
    try {
      const user = req.user as UserPayload;
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
    } catch (error: any) {
      logger.error('Get current user error', { error: error.message });
      throw error;
    }
  }

  /**
   * PUT /api/v1/auth/profile
   */
  static async updateProfile(req: Request, res: Response): Promise<void> {
    try {
      const user = req.user as UserPayload;
      // req.body can be undefined when multer processes a non-multipart request
      // (e.g. a plain JSON PUT with no file). Default to empty object to avoid crash.
      const request: UpdateProfileRequest = req.body ?? {};
      const imageFile = req.file;

      await LegacyAuthService.updateProfile(user.userId, request, imageFile);

      res.status(200).json({
        success: true,
        data: {},
        message: 'Profile updated successfully',
      });
    } catch (error: any) {
      logger.error('Update profile error', { error: error.message });
      throw error;
    }
  }

  /**
   * POST /api/v1/auth/change-password
   */
  static async changePassword(req: Request, res: Response): Promise<void> {
    try {
      const user = req.user as UserPayload;
      const request: ChangePasswordRequest = req.body;

      await LegacyAuthService.changePassword(user.userId, request);

      res.status(200).json({
        success: true,
        data: {},
        message: 'Password changed successfully',
      });
    } catch (error: any) {
      logger.error('Change password error', { error: error.message });

      throw error;
    }
  }

  /**
   * POST /api/v1/auth/reset-password-request
   */
  static async requestPasswordReset(req: Request, res: Response): Promise<void> {
    try {
      const { username, email } = req.body;
      const identifier = username || email;

      // Don't reveal if user exists (security)
      await sessionService.requestPasswordReset(identifier);

      res.status(200).json({
        success: true,
        message: 'If the identifier exists, a password reset email has been sent',
      });
    } catch (error: any) {
      logger.error('Request password reset error', { error: error.message });
      throw error;
    }
  }

  /**
   * POST /api/v1/auth/reset-password (Admin only)
   */
  static async resetPassword(req: Request, res: Response): Promise<void> {
    try {
      const request = req.body as ResetPasswordRequest & { username?: string; email?: string };
      const adminUser = req.user as UserPayload;
      const identifier = request.username || request.email || request.user_id;

      await sessionService.resetPassword(identifier, request.new_password, adminUser?.userId || 0);

      res.status(200).json({
        success: true,
        data: {},
        message: 'Password reset successful',
      });
    } catch (error: any) {
      logger.error('Reset password error', { error: error.message });
      throw error;
    }
  }


  /**
   * POST /api/v1/auth/verify-otp-reset-password
   */
  static async verifyOtpResetPassword(req: Request, res: Response): Promise<void> {
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
    } catch (error: any) {
      logger.error('Verify OTP reset password error', { error: error.message });
      throw error;
    }
  }

}
