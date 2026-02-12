import { Request, Response, NextFunction } from 'express';
import jwt, { JwtPayload } from 'jsonwebtoken';
import { env } from '@src/shared/config/env';
import { Role } from '@src/shared/config/permissions';
import { tokenBlacklistService } from '@src/domains/Auth/services/token-blacklist.service';
import prisma from '@src/database/client';

export interface UserPayload {
  userId: number;
  username?: string;
  role: Role;
  deviceId?: string;
  tenantId?: number;
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

function parseNumericTenantId(payload: Record<string, any>): number | null {
  const candidates = [
    'tenantId',
    'tenant_id',
    'companyId',
    'company_id',
    'clientId',
    'client_id',
    'merchantId',
    'merchant_id',
    'shopId',
    'shop_id',
    'orgId',
    'org_id',
    'businessId',
    'business_id',
  ];
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

  let decoded: JwtPayload | string;
  try {
    const verifyOptions: jwt.VerifyOptions = {};
    if (expectedIssuer) verifyOptions.issuer = expectedIssuer;
    if (expectedAudience) verifyOptions.audience = expectedAudience;

    decoded = jwt.verify(token, JWT_SECRET as jwt.Secret, verifyOptions);
  } catch (err: any) {
    if (err instanceof jwt.TokenExpiredError) {
      res.status(403).json({ success: false, message: 'Token expired', code: 'AUTH_TOKEN_EXPIRED' });
      return;
    }
    if (err instanceof jwt.JsonWebTokenError) {
      res.status(403).json({ success: false, message: 'Invalid or expired token', code: 'AUTH_TOKEN_INVALID' });
      return;
    }
    res.status(403).json({ success: false, message: 'Invalid token', code: 'AUTH_TOKEN_INVALID' });
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
  let tenantId = parseNumericTenantId(payload);

  if (tenantId === null) {
    try {
      const user = await prisma.user.findUnique({
        where: { userId },
        select: { tenantId: true },
      });
      tenantId = user?.tenantId ?? null;
    } catch {
      tenantId = null;
    }
  }

  req.user = {
    userId,
    username,
    role: roleValue as Role,
    deviceId,
    ...(tenantId !== null ? { tenantId } : {}),
  };

  req.clientIp = req.ip;

  next();
}
