import bcrypt from 'bcrypt';
import crypto from 'crypto';
import type { Prisma } from '@src/database/generated';
import prisma from '@src/database/client';
import { env } from '@src/shared/config/env';
type Tx = Prisma.TransactionClient;

import { AuthErrorCode } from '../../enums/V2/auth-error-codes';
import { TokenService } from './token.service';
import { RefreshTokenRepository } from '../../repository/V2/refresh-token.repository';

const repo = new RefreshTokenRepository();

function addDays(base: Date, days: number): Date {
  const d = new Date(base);
  d.setDate(d.getDate() + days);
  return d;
}

export class AuthService {
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
      },
    });

    if (!user) throw new Error(AuthErrorCode.INVALID_CREDENTIALS);
    if (user.status !== 'active') throw new Error(AuthErrorCode.INVALID_CREDENTIALS);

    const ok = await bcrypt.compare(input.password, user.passwordHash);
    if (!ok) throw new Error(AuthErrorCode.INVALID_CREDENTIALS);

    const now = new Date();
    const absoluteDays = Math.min(Math.max(env.JWT_V2_REFRESH_ABSOLUTE_DAYS || 30, 7), 30);
    const idleDays = Math.min(Math.max(env.JWT_V2_REFRESH_IDLE_DAYS || 7, 1), 14);

    const absoluteExpiresAt = addDays(now, absoluteDays);
    const idleExpiresAt = addDays(now, idleDays);

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
      deviceId: input.device_id,
    });

    return {
      token: accessToken,
      refresh_token: refreshRaw,
      token_type: 'Bearer',
      expires_in_seconds: TokenService.getAccessTokenTtlSeconds(),
      idle_expires_at: idleExpiresAt.toISOString(),
      absolute_expires_at: absoluteExpiresAt.toISOString(),
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
    const nextIdleExpiresAt = addDays(now, idleDays);
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
      deviceId: session.deviceId ?? undefined,
    });

    return {
      token: accessToken,
      refresh_token: newRefreshRaw,
      token_type: 'Bearer',
      expires_in_seconds: TokenService.getAccessTokenTtlSeconds(),
      idle_expires_at: nextIdleExpiresAt.toISOString(),
      absolute_expires_at: session.absoluteExpiresAt.toISOString(),
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