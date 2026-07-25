import { Request, Response, NextFunction } from 'express';
import jwt, { JwtPayload } from 'jsonwebtoken';
import { env } from '@src/shared/config/env';
import { Role } from '@src/shared/config/permissions';
import { tokenBlacklistService } from '@src/domains/Auth/services/V1/token-blacklist.service';
import prisma from '@src/database/client';
import { logger } from '@src/shared/utils/logger';

export interface UserPayload {
  userId: number;
  username?: string;
  role: Role;
  deviceId?: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: UserPayload;
      clientIp?: string;
    }
  }
}

/* ---------------- Helper functions ---------------- */

function parseAuthorizationHeader(header?: string): { scheme?: string; token?: string } {
  if (!header || typeof header !== 'string') return {};
  const parts = header.trim().split(/\s+/);
  if (parts.length === 0) return {};
  if (parts.length === 1) return { token: parts[0] };
  const scheme = parts[0];
  const token = parts.slice(1).join(' ');
  return { scheme, token };
}

function parseNumericUserId(payload: Record<string, any>): number | null {
  const candidates = ['userId', 'user_id', 'sub'];
  for (const key of candidates) {
    const v = payload[key];
    if (v === undefined || v === null) continue;
    if (typeof v === 'number' && Number.isInteger(v)) return v;
    if (typeof v === 'string' && /^[0-9]+$/.test(v)) return parseInt(v, 10);
  }
  return null;
}

function isValidRole(role: any): role is Role {
  return Object.values(Role).includes(role);
}

/* ---------------- Middleware ---------------- */

export async function authenticateToken(req: Request, res: Response, next: NextFunction): Promise<void> {
  const authHeader = req.headers['authorization'] as string | undefined;
  const { scheme, token } = parseAuthorizationHeader(authHeader);

  if (!token) {
    res.status(401).json({ success: false, message: 'Access token required', code: 'AUTH_TOKEN_REQUIRED' });
    return;
  }

  if (scheme && scheme.toLowerCase() !== 'bearer') {
    res.status(401).json({ success: false, message: 'Authorization scheme must be Bearer', code: 'AUTH_TOKEN_BAD_SCHEME' });
    return;
  }

  const JWT_SECRET = env.JWT_SECRET;
  if (!JWT_SECRET) {
    res.status(500).json({ success: false, message: 'Server configuration error', code: 'JWT_SECRET_MISSING' });
    return;
  }

  const expectedIssuer = env.JWT_ISSUER;
  const expectedAudience = env.JWT_AUDIENCE;

  let decoded: any;
  try {
    // Verify first with secret only to ensure it's a validly signed token
    decoded = jwt.verify(token, JWT_SECRET as jwt.Secret);

    // If verification passed, manually check issuer and audience if defined in env
    if (expectedIssuer && decoded.iss && decoded.iss !== expectedIssuer) {
      logger.warn('JWT issuer mismatch', { expected: expectedIssuer, actual: decoded.iss });
    }

    if (expectedAudience && decoded.aud && decoded.aud !== expectedAudience) {
      logger.warn('JWT audience mismatch', { expected: expectedAudience, actual: decoded.aud });
    }

  } catch (err: any) {
    if (err instanceof jwt.TokenExpiredError) {
      res.status(403).json({ success: false, message: 'Token expired', code: 'AUTH_TOKEN_EXPIRED' });
      return;
    }
    // Log the actual error for easier debugging
    logger.error('JWT verification failed', { error: err.message, token: token.substring(0, 10) + '...' });
    res.status(403).json({ success: false, message: 'Invalid or expired token', code: 'AUTH_TOKEN_INVALID' });
    return;
  }

  if (typeof decoded === 'string' || !decoded) {
    res.status(403).json({ success: false, message: 'Invalid token payload', code: 'AUTH_TOKEN_INVALID_PAYLOAD' });
    return;
  }

  const payload = decoded as JwtPayload & Record<string, any>;

  const userId = parseNumericUserId(payload);
  if (userId === null) {
    res.status(403).json({ success: false, message: 'Invalid token payload: user id missing', code: 'AUTH_TOKEN_INVALID_PAYLOAD' });
    return;
  }

  const roleValue = payload.role;
  if (!isValidRole(roleValue)) {
    res.status(403).json({ success: false, message: 'Invalid token payload: role missing or invalid', code: 'AUTH_TOKEN_INVALID_ROLE' });
    return;
  }

  const jti = payload.jti;
  if (!jti || typeof jti !== 'string') {
    res.status(403).json({ success: false, message: 'Invalid token payload: jti required for revocation', code: 'AUTH_TOKEN_MISSING_JTI' });
    return;
  }

  try {
    let isRevoked = false;
    const maybeIsJtiFn = (tokenBlacklistService as any).isJtiBlacklisted;
    if (typeof maybeIsJtiFn === 'function') {
      isRevoked = await (tokenBlacklistService as any).isJtiBlacklisted(jti);
    } else if (typeof (tokenBlacklistService as any).isTokenBlacklisted === 'function') {
      isRevoked = await (tokenBlacklistService as any).isTokenBlacklisted(token);
    } else {
      isRevoked = false;
    }

    if (isRevoked) {
      res.status(403).json({ success: false, message: 'Token has been revoked', code: 'AUTH_TOKEN_REVOKED' });
      return;
    }
  } catch (err) {
    res.status(500).json({ success: false, message: 'Token revocation check failed', code: 'AUTH_REVOCATION_CHECK_FAILED' });
    return;
  }

  const username = (payload.username as string) ?? (payload.user_name as string) ?? undefined;
  const deviceId = (payload.deviceId as string) ?? (payload.device_id as string) ?? undefined;

  req.user = {
    userId,
    username,
    role: roleValue as Role,
    deviceId,
  };

  req.clientIp = req.ip;

  next();
}

export function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  if (req.user?.role !== 'ADMIN') {
    res.status(403).json({
      success: false,
      message: 'Admin access required',
      code: 'FORBIDDEN_ADMIN_ONLY',
    });
    return;
  }
  next();
}

export function requirePermission(featureKey: string) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'Authentication required', code: 'UNAUTHORIZED' });
      return;
    }

    // ADMIN has 100% full feature access automatically
    if (req.user.role === 'ADMIN') {
      next();
      return;
    }

    try {
      const permission = await prisma.userPermission.findFirst({
        where: {
          userId: req.user.userId,
          featureKey,
        },
      });

      if (!permission) {
        res.status(403).json({
          success: false,
          message: `Access denied. Feature '${featureKey}' is not assigned to your account by an Admin.`,
          code: 'FEATURE_ACCESS_DENIED',
          featureKey,
        });
        return;
      }

      next();
    } catch (err: any) {
      res.status(500).json({
        success: false,
        message: 'Permission check failed',
        code: 'PERMISSION_CHECK_FAILED',
      });
    }
  };
}

