import bcrypt from 'bcrypt';
import crypto from 'crypto';
import type { Prisma } from '@src/database/generated';
import prisma from '@src/database/client';
import { env } from '@src/shared/config/env';
type Tx = Prisma.TransactionClient;

import { AuthErrorCode } from '../../enums/V2/auth-error-codes';
import { TokenService as TokenServiceV1 } from '../token.service'; // For V1 compatibility if needed, or just use V2 TokenService
import { TokenService } from './token.service';
import { RefreshTokenRepository } from '../../repository/V2/refresh-token.repository';
import { addDaysToDate, toPhnomPenhISOString } from '@src/shared/utils/date-utils';
import { logger } from '@src/shared/utils/logger';
import { sendPasswordResetEmailJob } from '@src/domains/Auth/jobs/send-password-reset-email.job';

const repo = new RefreshTokenRepository();

export class AuthService {
  /**
   * Request password reset
   */
  async requestPasswordReset(identifier: string): Promise<void> {
    // Get user by username or email
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { username: identifier },
          { email: identifier },
        ],
      },
      select: {
        userId: true,
        username: true,
        email: true,
        fullName: true,
        role: true,
        status: true,
        tenantId: true,
      },
    });

    if (!user) {
      // Don't reveal if user exists (security best practice)
      logger.warn('Password reset requested for non-existent user', { identifier });
      return;
    }

    // Check user status
    if (user.status !== 'active') {
      logger.warn('Password reset requested for inactive user', { userId: user.userId });
      return;
    }

    // Restriction: Only Admin can reset password via OTP
    if (user.role === 'SELLER') {
      throw new Error('This account is for a seller. Please contact admin.');
    }

    // Send password reset email (async job)
    if (!user.email) {
      logger.warn('Password reset requested but user has no email', { userId: user.userId });
      return;
    }

    // Generate 6-digit OTP
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();

    // Set expiration to 15 minutes from now
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

    // Delete any existing unused OTPs for this user
    await prisma.$executeRaw`
      DELETE FROM password_reset_otps 
      WHERE user_id = ${user.userId} 
      AND used_at IS NULL
    `;

    // Store OTP in database
    await prisma.$executeRaw`
      INSERT INTO password_reset_otps (user_id, otp_code, expires_at)
      VALUES (${user.userId}, ${otpCode}, ${expiresAt})
    `;

    // Fire-and-forget email sending
    void sendPasswordResetEmailJob({
      toEmail: user.email,
      username: user.username,
      fullName: user.fullName,
      otpCode,
    }).catch((error) => {
      logger.error('Failed to enqueue/send password reset email', {
        userId: user.userId,
        error: (error as any)?.message || error,
      });
    });

    logger.info('Password reset OTP generated', { userId: user.userId });
  }

  /**
   * Verify OTP and return tokens for password reset flow
   */
  async verifyOtp(input: {
    email: string;
    otpCode: string;
  }): Promise<void> {
    // Find user by email
    const user = await prisma.user.findFirst({
      where: { email: input.email },
      select: {
        userId: true,
        username: true,
        email: true,
        status: true,
        role: true,
        tenantId: true,
      },
    });

    if (!user) {
      throw new Error('Invalid email or OTP');
    }

    // Check user status
    if (user.status !== 'active') {
      throw new Error('User account is not active');
    }

    // Restriction: Only Admin can reset password via OTP
    if (user.role === 'SELLER') {
      throw new Error('This account is for a seller. Please contact admin.');
    }

    // Verify OTP
    const otpRecord = await prisma.$queryRaw<Array<{
      id: number;
      user_id: number;
      otp_code: string;
      expires_at: Date;
      used_at: Date | null;
    }>>`
      SELECT id, user_id, otp_code, expires_at, used_at
      FROM password_reset_otps
      WHERE user_id = ${user.userId}
      AND otp_code = ${input.otpCode}
      AND used_at IS NULL
      ORDER BY created_at DESC
      LIMIT 1
    `;

    if (!otpRecord || otpRecord.length === 0) {
      throw new Error('Invalid or expired OTP');
    }

    const otp = otpRecord[0];

    // Check if OTP is expired
    if (new Date() > new Date(otp.expires_at)) {
      throw new Error('OTP has expired');
    }

    // Mark OTP as used
    await prisma.$executeRaw`
      UPDATE password_reset_otps
      SET used_at = CURRENT_TIMESTAMP
      WHERE id = ${otp.id}
    `;

    // Generate tokens so user can proceed to reset password
    // const accessToken = TokenService.generateAccessToken({
    //   userId: user.userId,
    //   role: user.role as 'ADMIN' | 'SELLER',
    //   tenantId: user.tenantId ?? 1,
    // });

    logger.info('OTP verified successfully', { userId: user.userId });
  }

  /**
   * Reset password (Admin only)
   */
  async resetPassword(identifier: string | number, newPassword: string, adminUserId: number): Promise<void> {
    // Verify target user exists
    const user = await prisma.user.findFirst({
      where: typeof identifier === 'number'
        ? { userId: identifier }
        : {
          OR: [
            { username: identifier },
            { email: identifier },
          ],
        },
      select: {
        userId: true,
        username: true,
        status: true,
        role: true,
      },
    });

    if (!user) {
      throw new Error('User not found');
    }

    // Restriction: Only Admin can be reset password 
    if (user.role === 'SELLER') {
      throw new Error('This account is for a seller. Please contact admin.');
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 12);

    // Update password
    await prisma.$executeRaw`
      UPDATE users
      SET password_hash = ${hashedPassword}
      WHERE user_id = ${user.userId}
    `;

    logger.info('Password reset by admin', {
      userId: user.userId,
      adminUserId,
    });
  }
  async login(input: {
    username: string;
    password: string;
    device_id?: string;
    ip?: string;
    user_agent?: string;
  }) {
    const user = await prisma.user.findUnique({
      where: { username: input.username },
      select: {
        userId: true,
        username: true,
        passwordHash: true,
        role: true,
        status: true,
        tenantId: true,
      },
    });

    if (!user) throw new Error(AuthErrorCode.INVALID_CREDENTIALS);
    if (user.status !== 'active') throw new Error(AuthErrorCode.INVALID_CREDENTIALS);

    const ok = await bcrypt.compare(input.password, user.passwordHash);
    if (!ok) throw new Error(AuthErrorCode.INVALID_CREDENTIALS);

    const now = new Date();
    const absoluteDays = Math.min(Math.max(env.JWT_V2_REFRESH_ABSOLUTE_DAYS || 30, 7), 30);
    const idleDays = Math.min(Math.max(env.JWT_V2_REFRESH_IDLE_DAYS || 7, 1), 14);

    const absoluteExpiresAt = addDaysToDate(now, absoluteDays);
    const idleExpiresAt = addDaysToDate(now, idleDays);

    const tokenFamilyId = crypto.randomUUID();
    const refreshRaw = TokenService.generateOpaqueRefreshToken();
    const refreshHash = TokenService.hashRefreshToken(refreshRaw);

    await repo.createSession({
      userId: user.userId,
      refreshTokenHash: refreshHash,
      tokenFamilyId,
      absoluteExpiresAt,
      idleExpiresAt,
      deviceId: input.device_id ?? null,
      ipAddress: input.ip ?? null,
      userAgent: input.user_agent ?? null,
    });

    const accessToken = TokenService.generateAccessToken({
      userId: user.userId,
      role: user.role as 'ADMIN' | 'SELLER',
      tenantId: user.tenantId ?? 1,
      deviceId: input.device_id,
    });

    return {
      token: accessToken,
      refresh_token: refreshRaw,
      token_type: 'Bearer',
      expires_in_seconds: TokenService.getAccessTokenTtlSeconds(),
      idle_expires_at: toPhnomPenhISOString(idleExpiresAt),
      absolute_expires_at: toPhnomPenhISOString(absoluteExpiresAt),
      user: {
        user_id: user.userId,
        username: user.username,
        role: user.role,
      },
    };
  }

  async refresh(input: {
    refresh_token: string;
    device_id?: string;
    ip?: string;
    user_agent?: string;
  }) {
    const now = new Date();
    const refreshHash = TokenService.hashRefreshToken(input.refresh_token);
    const session = await repo.findByTokenHash(refreshHash);

    if (!session) throw new Error(AuthErrorCode.INVALID_REFRESH_TOKEN);

    if (session.revokedAt) {
      await repo.revokeFamily(session.tokenFamilyId);
      throw new Error(AuthErrorCode.TOKEN_REUSE_DETECTED);
    }

    if (now > session.idleExpiresAt) {
      await repo.revokeSession(session.id);
      throw new Error(AuthErrorCode.REFRESH_IDLE_EXPIRED);
    }

    if (now > session.absoluteExpiresAt) {
      await repo.revokeSession(session.id);
      throw new Error(AuthErrorCode.REFRESH_ABSOLUTE_EXPIRED);
    }

    if (!session.user || session.user.status !== 'active') {
      await repo.revokeSession(session.id);
      throw new Error(AuthErrorCode.TOKEN_REVOKED);
    }

    const deviceBindingEnabled = false; // template: load from app settings
    if (deviceBindingEnabled && session.deviceId && input.device_id !== session.deviceId) {
      await repo.revokeSession(session.id);
      throw new Error(AuthErrorCode.DEVICE_REVOKED);
    }

    const idleDays = Math.min(Math.max(env.JWT_V2_REFRESH_IDLE_DAYS || 7, 1), 14);
    const nextIdleExpiresAt = addDaysToDate(now, idleDays);
    const newRefreshRaw = TokenService.generateOpaqueRefreshToken();
    const newRefreshHash = TokenService.hashRefreshToken(newRefreshRaw);

    await prisma.$transaction(async (tx) => {
      await repo.rotateToken(tx, {
        currentSessionId: session.id,
        userId: session.userId,
        newRefreshTokenHash: newRefreshHash,
        tokenFamilyId: session.tokenFamilyId,
        absoluteExpiresAt: session.absoluteExpiresAt,
        nextIdleExpiresAt,
        deviceId: session.deviceId ?? null,
        ipAddress: input.ip ?? null,
        userAgent: input.user_agent ?? null,
      });
    });


    const accessToken = TokenService.generateAccessToken({
      userId: session.userId,
      role: session.user.role as 'ADMIN' | 'SELLER',
      tenantId: session.user.tenantId ?? 1,
      deviceId: session.deviceId ?? undefined,
    });

    return {
      token: accessToken,
      refresh_token: newRefreshRaw,
      token_type: 'Bearer',
      expires_in_seconds: TokenService.getAccessTokenTtlSeconds(),
      idle_expires_at: toPhnomPenhISOString(nextIdleExpiresAt),
      absolute_expires_at: toPhnomPenhISOString(session.absoluteExpiresAt),
    };
  }

  async logout(input: { refresh_token: string }) {
    const hash = TokenService.hashRefreshToken(input.refresh_token);
    const session = await repo.findByTokenHash(hash);
    if (!session) return { revoked: true };
    await repo.revokeSession(session.id);
    return { revoked: true };
  }

  async logoutAll(userId: number) {
    await repo.revokeAllForUser(userId);
    return { revoked_all: true };
  }

  async me(userId: number) {
    const user = await prisma.user.findUnique({
      where: { userId },
      select: { userId: true, username: true, role: true, status: true },
    });
    if (!user) throw new Error(AuthErrorCode.TOKEN_REVOKED);
    return {
      user_id: user.userId,
      username: user.username,
      role: user.role,
      status: user.status,
    };
  }
}
