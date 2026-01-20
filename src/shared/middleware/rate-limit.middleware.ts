import { Request, Response, NextFunction } from 'express';
import rateLimit from 'express-rate-limit';
import { env } from '@src/shared/config/env';

// No-op middleware for development (unlimited requests)
const noOpRateLimiter = (req: Request, res: Response, next: NextFunction) => {
  next();
};

// General API rate limit (production only)
const apiRateLimiterConfig = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: {
    success: false,
    message: 'Too many requests, please try again later',
    code: 'RATE_LIMIT_EXCEEDED',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Strict rate limit for auth endpoints (production only)
const authRateLimiterConfig = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 5 login attempts per windowMs
  message: {
    success: false,
    message: 'Too many login attempts, please try again later',
    code: 'AUTH_RATE_LIMIT_EXCEEDED',
  },
  skipSuccessfulRequests: true,
});

// Conditional rate limiters: unlimited in development, enforced in production
export const apiRateLimiter =
  env.NODE_ENV === 'production' ? apiRateLimiterConfig : noOpRateLimiter;

export const authRateLimiter =
  env.NODE_ENV === 'production' ? authRateLimiterConfig : noOpRateLimiter;