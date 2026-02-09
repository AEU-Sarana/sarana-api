import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { Role } from '@src/shared/config/permissions';
import { tokenBlacklistService } from '@src/domains/Auth/services/token-blacklist.service';

export interface UserPayload {
  userId: number;
  username: string;
  role: Role;
  deviceId?: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: UserPayload;
    }
  }
}

export async function authenticateToken(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; 

  if (!token) {
    res.status(401).json({
      success: false,
      message: 'Access token required',
      code: 'AUTH_TOKEN_REQUIRED',
    });
    return;
  }

  // Check if token is blacklisted (logout)
  const isBlacklisted = await tokenBlacklistService.isTokenBlacklisted(token);
  if (isBlacklisted) {
    res.status(403).json({
      success: false,
      message: 'Token has been revoked',
      code: 'AUTH_TOKEN_REVOKED',
    });
    return;
  }

  const JWT_SECRET = process.env.JWT_SECRET;
  if (!JWT_SECRET) {
    res.status(500).json({
      success: false,
      message: 'Server configuration error',
      code: 'JWT_SECRET_MISSING',
    });
    return;
  }

  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) {
      res.status(403).json({
        success: false,
        message: 'Invalid or expired token',
        code: 'AUTH_TOKEN_INVALID',
      });
      return;
    }

    // Basic runtime validation of decoded token payload to avoid calling
    // downstream services with undefined user IDs (which leads to runtime
    // Prisma errors). We expect the token to include a numeric `userId`.
    const maybePayload = decoded as Partial<UserPayload> | null;
    if (!maybePayload || typeof maybePayload.userId !== 'number') {
      res.status(403).json({
        success: false,
        message: 'Invalid token payload',
        code: 'AUTH_TOKEN_INVALID_PAYLOAD',
      });
      return;
    }

    req.user = {
      userId: maybePayload.userId,
      username: maybePayload.username ?? '',
      role: maybePayload.role as any,
      deviceId: maybePayload.deviceId,
    } as UserPayload;

    next();
  });
}