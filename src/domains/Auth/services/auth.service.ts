import bcrypt from 'bcrypt';
import { env } from '@src/shared/config/env';
import { TokenService } from './token.service';
import { tokenBlacklistService } from './token-blacklist.service';
import prisma from '@src/database/client';
import { UserRole, UserStatus } from '@src/domains/Auth/enums';
import { 
  LoginRequest, 
  LoginResponse, 
  RefreshTokenRequest, 
  RefreshTokenResponse,
  ChangePasswordRequest,
  ResetPasswordRequest,
} from '@src/domains/Auth/types/auth.types';
import { BusinessLogicException, ValidationException } from '@src/shared/exceptions';
import { logger } from '@src/shared/utils/logger';
import { sendPasswordResetEmailJob } from '@src/domains/Auth/jobs/send-password-reset-email.job';
import { auditLogService } from '@src/shared/services/audit-log.service';
import { CurrentUser } from '../types/user.types';
import { hashPIN, verifyPIN } from '@src/shared/services/pin.service';

export class AuthService {
  /**
   * Login user
   */
  static async login(request: LoginRequest): Promise<LoginResponse> {
    const { username, password } = request;

    // Find user by username
    const user = await prisma.user.findUnique({
      where: { username },
      select: {
        userId: true,
        username: true,
        fullName: true,
        passwordHash: true,
        role: true,
        status: true,
        createdAt: true,
      },
    });

    if (!user) {
      throw new ValidationException('Invalid username or password');
    }

    // Check user status
    if (user.status !== UserStatus.ACTIVE) {
      throw new BusinessLogicException('User account is inactive');
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      throw new ValidationException('Invalid username or password');
    }

    // Generate tokens
    const accessToken = TokenService.generateAccessToken({
      userId: user.userId,
      username: user.username,
      role: user.role as UserRole,
    });

    // const refreshToken = TokenService.generateRefreshToken(user.userId);

    // Get token expiry in Phnom Penh timezone
    const expiresAt = TokenService.getTokenExpiryPhnomPenh(accessToken);

    // Log login
    logger.info('User logged in', {
      userId: user.userId,
      username: user.username,
      role: user.role,
    });

    return {
      token: accessToken,
      user: {
        user_id: user.userId,
        username: user.username,
        full_name: user.fullName,
        role: user.role,
        status: user.status,
      },
      expires_at: expiresAt || null,
    };
  }

  /**
   * Logout user (blacklist token)
   */
  static async logout(token: string): Promise<void> {
    try {
      // Decode token to get expiry
      const decoded = TokenService.decodeToken(token);
      const expiry = decoded?.exp ? decoded.exp - Math.floor(Date.now() / 1000) : 3600;

      // Add to blacklist
      await tokenBlacklistService.blacklistToken(token, expiry);

      logger.info('User logged out', { token: token.substring(0, 20) + '...' });
    } catch (error) {
      logger.error('Error during logout', { error });
      // Don't throw - logout should always succeed
    }
  }

  /**
   * Refresh access token
   */
  static async refreshToken(request: RefreshTokenRequest): Promise<RefreshTokenResponse> {
    const { refreshToken } = request;

    // Verify refresh token
    const decoded = TokenService.verifyRefreshToken(refreshToken);

    // Check if refresh token is blacklisted
    const isBlacklisted = await tokenBlacklistService.isTokenBlacklisted(refreshToken);
    if (isBlacklisted) {
      throw new ValidationException('Refresh token has been revoked');
    }

    // Get user
    const user = await prisma.user.findUnique({
      where: { userId: decoded.userId },
      select: {
        userId: true,
        username: true,
        role: true,
        status: true,
      },
    });

    if (!user) {
      throw new ValidationException('User not found');
    }

    // Check user status
    if (user.status !== UserStatus.ACTIVE) {
      throw new BusinessLogicException('User account is inactive');
    }

    // Generate new access token
    const accessToken = TokenService.generateAccessToken({
      userId: user.userId,
      username: user.username,
      role: user.role as UserRole,
    });

    // Optionally generate new refresh token (refresh token rotation)
    const newRefreshToken = TokenService.generateRefreshToken(user.userId);

    // Blacklist old refresh token (if using refresh token rotation)
    await tokenBlacklistService.blacklistToken(refreshToken, 86400);

    const expiresAt = TokenService.getTokenExpiryPhnomPenh(accessToken);

    return {
      token: accessToken,
      expires_at: expiresAt || null,
    };
  }

  /**
   * Get current user information
   */
  static async getCurrentUser(userId: number): Promise<CurrentUser> {
    const user = await prisma.user.findUnique({
      where: { userId },
      select: {
        userId: true,
        username: true,
        email: true,
        fullName: true,
        role: true,
        phone: true,
        status: true,
        deviceId: true,
        isDeviceBound: true,
      },
    });

    if (!user) {
      throw new ValidationException('User not found');
    }

    // Check user status
    if (user.status !== UserStatus.ACTIVE) {
      throw new BusinessLogicException('User account is inactive');
    }

    return {
      user_id: user.userId,
      username: user.username,
      email: user.email,
      full_name: user.fullName,
      role: user.role as UserRole,
      phone: user.phone,
      status: user.status,
      device_id: user.deviceId,
      is_device_bound: user.isDeviceBound,
    };
  }

  /**
   * Change password (authenticated user)
   */
  static async changePassword(
    userId: number,
    request: ChangePasswordRequest
  ): Promise<void> {
    const { current_password, new_password } = request;

    // Get user
    const user = await prisma.user.findUnique({
      where: { userId },
      select: {
        userId: true,
        passwordHash: true,
      },
    });

    if (!user) {
      throw new ValidationException('User not found');
    }

    // Verify current password
    const isPasswordValid = await bcrypt.compare(current_password, user.passwordHash);
    if (!isPasswordValid) {
      throw new ValidationException('Current password is incorrect');
    }

    // Hash new password
    const newPasswordHash = await bcrypt.hash(new_password, env.BCRYPT_SALT_ROUNDS);

    // Update password
    await prisma.user.update({
      where: { userId },
      data: { passwordHash: newPasswordHash },
    });

    logger.info('Password changed', { userId });
  }

  /**
   * Request password reset
   */
  static async requestPasswordReset(username: string): Promise<void> {
    // Get user
    const user = await prisma.user.findUnique({
      where: { username },
      select: {
        userId: true,
        username: true,
        email: true,
        fullName: true,
        role: true,
        status: true,
      },
    });

    if (!user) {
      // Don't reveal if user exists (security best practice)
      logger.warn('Password reset requested for non-existent user', { username });
      return;
    }

    // Check user status
    if (user.status !== UserStatus.ACTIVE) {
      logger.warn('Password reset requested for inactive user', { userId: user.userId });
      return;
    }

    // Generate reset token (JWT with short expiry)
    const resetToken = TokenService.generateAccessToken({
      userId: user.userId,
      username: user.username,
      role: user.role as UserRole,
    });

    // Store reset token in database (optional - for tracking)
    // Or use JWT with short expiry (15 minutes)

    // Send password reset email (async job)
    // If user has no email, we silently skip (security + data quality)
    if (!user.email) {
      logger.warn('Password reset requested but user has no email', { userId: user.userId });
      return;
    }

    // Fire-and-forget (do not block the response)
    void sendPasswordResetEmailJob({
      toEmail: user.email,
      username: user.username,
      fullName: user.fullName,
      resetToken,
    }).catch((error) => {
      logger.error('Failed to enqueue/send password reset email', {
        userId: user.userId,
        error: (error as any)?.message || error,
      });
    });

    logger.info('Password reset requested', { userId: user.userId });
  }

  /**
   * Reset password (admin only - reset another user's password)
   */
  static async resetPassword(userId: number, newPassword: string, adminUserId: number): Promise<void> {
    // Get user
    const user = await prisma.user.findUnique({
      where: { userId },
      select: {
        userId: true,
        status: true,
      },
    });

    if (!user) {
      throw new ValidationException('User not found');
    }

    // Check user status
    if (user.status !== UserStatus.ACTIVE) {
      throw new BusinessLogicException('User account is inactive');
    }

    // Hash new password
    const newPasswordHash = await bcrypt.hash(newPassword, env.BCRYPT_SALT_ROUNDS);

    // Update password
    await prisma.user.update({
      where: { userId: user.userId },
      data: {
        passwordHash: newPasswordHash,
        updatedBy: adminUserId,
      },
    });

    logger.info('Password reset completed', { userId: user.userId, adminUserId });
  }

  /**
   * Reset user PIN
  */
  static async resetPIN(
    userId: number,
    newPin: string,
    currentUserId: number
  ): Promise<void> {
    // Validate PIN format
    if (!/^\d{4,6}$/.test(newPin)) {
      throw new ValidationException('PIN must be 4-6 numeric digits');
    }

    // Hash PIN
    const pinHash = await hashPIN(newPin);

    // Update user PIN
    await prisma.user.update({
      where: { userId },
      data: {
        pinHash: pinHash,
        updatedBy: currentUserId,
        updatedAt: new Date(),
      },
    });

    // Audit log
    await auditLogService.createAuditLog({
      userId: currentUserId,
      action: 'RESET_PIN',
      resource: 'User',
      entityId: userId,
      details: { targetUserId: userId },
    });
  }

  /**
   *​Change user PIN
  */
  static async changePIN(
    currentUserId: number,
    currentPin: string,
    newPin: string
  ): Promise<void> {
    // Get user
    const user = await prisma.user.findUnique({
      where: { userId: currentUserId },
    });

    if (!user || !user.pinHash) {
      throw new ValidationException('PIN not configured for user');
    }

    // Verify current PIN
    const isValidPIN = await verifyPIN(currentPin, user.pinHash);

    if (!isValidPIN) {
      throw new ValidationException('Current PIN is incorrect');
    }

    // Validate new PIN format
    if (!/^\d{4,6}$/.test(newPin)) {
      throw new ValidationException('PIN must be 4-6 numeric digits');
    }

    // Hash new PIN
    const pinHash = await hashPIN(newPin);

    // Update user PIN
    await prisma.user.update({
      where: { userId: currentUserId },
      data: {
        pinHash: pinHash,
        updatedBy: currentUserId,
        updatedAt: new Date(),
      },
    });

    // Audit log
    await auditLogService.createAuditLog({
      userId: currentUserId,
      action: 'CHANGE_PIN',
      resource: 'User',
      entityId: currentUserId,
    });
  }
}
