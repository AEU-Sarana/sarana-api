import crypto from 'crypto';
import jwt, { type Secret } from 'jsonwebtoken';
import { env } from '@src/shared/config/env';
import { AccessTokenPayload } from '@src/domains/Auth/types/V2/auth.types';

export class TokenService {
  static generateAccessToken(payload: {
    userId: number;
    role: 'ADMIN' | 'SELLER';
    deviceId?: string;
  }): string {
    const claims: AccessTokenPayload = {
      userId: payload.userId,
      role: payload.role,
      deviceId: payload.deviceId,
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
    return 600; // template: parse env in real implementation
  }
}