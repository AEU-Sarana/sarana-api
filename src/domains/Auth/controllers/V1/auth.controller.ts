import { Request, Response } from 'express';
import { AuthService } from '@src/domains/Auth/services/auth.service';
import { 
  LoginRequest, 
  RefreshTokenRequest,
  ChangePasswordRequest,
  ChangePINRequest,
  ResetPasswordRequest,
  ResetPINRequest,
} from '@src/domains/Auth/types/auth.types';
import { UserPayload } from '@src/shared/middleware/auth.middleware';
import { logger } from '@src/shared/utils/logger';

export class AuthController {
  /**
   * POST /api/v1/auth/login
   */
  static async login(req: Request, res: Response): Promise<void> {
    try {
      const request: LoginRequest = req.body;
      const response = await AuthService.login(request);

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
      const authHeader = req.headers.authorization;
      const token = authHeader?.split(' ')[1];

      if (token) {
        await AuthService.logout(token);
      }

      res.status(200).json({
        success: true,
        data: {},
        message: 'Logout successful',
      });
    } catch (error: any) {
      logger.error('Logout error', { error: error.message });
      throw error;
    }
  }

  /**
   * POST /api/v1/auth/refresh-token
   */
  static async refreshToken(req: Request, res: Response): Promise<void> {
    try {
      const request: RefreshTokenRequest = req.body;
      const response = await AuthService.refreshToken(request);

      res.status(200).json({
        success: true,
        data: response,
        message: 'Token refreshed',
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

      const userData = await AuthService.getCurrentUser(user.userId);

      res.status(200).json({
        success: true,
        data: userData,
        message: 'User retrieved',
      });
    } catch (error: any) {
      logger.error('Get current user error', { error: error.message });
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

      await AuthService.changePassword(user.userId, request);

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
      const { username } = req.body;

      // Don't reveal if user exists (security)
      await AuthService.requestPasswordReset(username);

      res.status(200).json({
        success: true,
        message: 'If the username exists, a password reset email has been sent',
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
      const request: ResetPasswordRequest = req.body;
      const adminUser = req.user as UserPayload;

      await AuthService.resetPassword(request.user_id, request.new_password, adminUser.userId);

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
   * POST /api/v1/auth/reset-pin (Admin only)
   */
  static async resetPIN(req: Request, res: Response): Promise<void> {
    try {
      const request: ResetPINRequest = req.body;
      const adminUser = req.user as UserPayload;

      await AuthService.resetPIN(request.user_id, request.new_pin, adminUser.userId);

      res.status(200).json({
        success: true,
        data: {
          user_id: request.user_id,
          pin_reset: true,
        },
        message: 'PIN reset successful',
      });
    } catch (error: any) {
      logger.error('Reset PIN error', { error: error.message });
      throw error;
    }
  }

  /**
   * POST /api/v1/auth/change-pin
   */
  static async changePIN(req: Request, res: Response): Promise<void> {
    try {
      const user = req.user as UserPayload;
      const request: ChangePINRequest = req.body;

      await AuthService.changePIN(user.userId, request.current_pin, request.new_pin);

      res.status(200).json({
        success: true,
        data: {
          pin_changed: true,
        },
        message: 'PIN changed successfully',
      });
    } catch (error: any) {
      logger.error('Change PIN error', { error: error.message });
      throw error;
    }
  }
}
