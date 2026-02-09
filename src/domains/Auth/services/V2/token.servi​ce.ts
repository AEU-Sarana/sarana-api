import crypto from 'crypto';
import jwt, { type Secret } from 'jsonwebtoken';
import { env } from '@src/shared/config/env';
import ms from 'ms';
import { AccessTokenPayload } from '@src/domains/Auth/types/V2/au​th.types';

export class TokenService {
  static generateAccessToken(payload: {
    userId: number;
    role: 'ADMIN' | 'SELLER';
    deviceId?: string;
  }): string {
    const claims: AccessTokenPayload = {
      user_id: payload.userId,
      role: payload.role,
      device_id: payload.deviceId,
      jti: crypto.randomUUID(),
      iat: Math.floor(Date.now() / 1000),
    };

    return jwt.sign(claims, env.JWT_SECRET as Secret, {
      expiresIn: env.JWT_V2_ACCESS_TOKEN_EXPIRY,
      issuer: env.JWT_ISSUER,
      audience: env.JWT_AUDIENCE,
      subject: String(payload.userId),
    });
  }

  static generateOpaqueRefreshToken(): string {
    return crypto.randomBytes(32).toString('base64url');
  }

  static hashRefreshToken(raw: string): string {
    return crypto.createHash('sha256').update(raw).digest('hex');
  }

   static getAccessTokenTtlSeconds(): number {
    const expiry = env.JWT_V2_ACCESS_TOKEN_EXPIRY; // e.g. "10m", "24h"

    const milliseconds = ms(expiry);
    if (!milliseconds || milliseconds <= 0) {
      throw new Error(`Invalid JWT_V2_ACCESS_TOKEN_EXPIRY value: ${expiry}`);
    }

    return Math.floor(milliseconds / 1000);
  }
}