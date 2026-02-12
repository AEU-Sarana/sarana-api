import jwt, { type SignOptions } from 'jsonwebtoken';
import { env } from '@src/shared/config/env';
import { UserPayload, TokenPayload, RefreshTokenPayload } from '@src/domains/Auth/types/auth.types';
import { logger } from '@src/shared/utils/logger';
import { toPhnomPenhISOString } from '@src/shared/utils/date-utils';

export class TokenService {
  /**
   * Generate access token
   */
  static generateAccessToken(payload: UserPayload): string {
    const tokenPayload: TokenPayload = {
      userId: payload.userId,
      username: payload.username,
      role: payload.role,
      tenantId: payload.tenantId,
      iat: Math.floor(Date.now() / 1000),
    };

    return jwt.sign(tokenPayload, env.JWT_SECRET, {
      expiresIn: env.JWT_ACCESS_TOKEN_EXPIRY,
    } as SignOptions);
  }

  /**
   * Generate refresh token
   */
  static generateRefreshToken(userId: number): string {
    const tokenPayload: RefreshTokenPayload = {
      userId,
      tokenType: 'refresh',
      iat: Math.floor(Date.now() / 1000),
    };

    return jwt.sign(tokenPayload, env.JWT_REFRESH_SECRET, {
      expiresIn: env.JWT_REFRESH_TOKEN_EXPIRY,
    } as SignOptions);
  }

  /**
   * Verify access token
   */
  static verifyAccessToken(token: string): TokenPayload {
    try {
      const decoded = jwt.verify(token, env.JWT_SECRET) as TokenPayload;
      return decoded;
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        throw new Error('Token expired');
      }
      if (error instanceof jwt.JsonWebTokenError) {
        throw new Error('Invalid token');
      }
      throw error;
    }
  }

  /**
   * Verify refresh token
   */
  static verifyRefreshToken(token: string): RefreshTokenPayload {
    try {
      const decoded = jwt.verify(token, env.JWT_REFRESH_SECRET) as RefreshTokenPayload;
      
      if (decoded.tokenType !== 'refresh') {
        throw new Error('Invalid token type');
      }
      
      return decoded;
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        throw new Error('Refresh token expired');
      }
      if (error instanceof jwt.JsonWebTokenError) {
        throw new Error('Invalid refresh token');
      }
      throw error;
    }
  }

  /**
   * Decode token without verification (for debugging)
   */
  static decodeToken(token: string): any {
    return jwt.decode(token);
  }

  /**
   * Get token expiry time
   */
  static getTokenExpiry(token: string): Date | null {
    const decoded = jwt.decode(token) as any;
    if (decoded && decoded.exp) {
      return new Date(decoded.exp * 1000);
    }
    return null;
  }

  /**
   * Get token expiry time as ISO string in Phnom Penh timezone
   */
  static getTokenExpiryPhnomPenh(token: string): string | null {
    const expiry = this.getTokenExpiry(token);
    if (!expiry) {
      return null;
    }
    return toPhnomPenhISOString(expiry);
  }
}
