import { Request, Response, NextFunction } from 'express';
import rateLimit, { ipKeyGenerator } from 'express-rate-limit';
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

// Strict rate limit for receipt scanning (production only)
const receiptScanRateLimiterConfig = rateLimit({
  windowMs: 60 * 60 * 1000, 
  max: 60, 
  keyGenerator: (req: Request) => {
    const receiptCode =
      typeof req.body?.receipt_code === 'string' ? req.body.receipt_code : 'unknown';
    return `${ipKeyGenerator(req.ip)}:${receiptCode}`;
  },
  message: {
    success: false,
    message: 'Too many scans, please try again later',
    code: 'SCAN_RATE_LIMIT_EXCEEDED',
  },
});

// Rate limit for telegram webhook (production only)
// Even with a secret token, we want to prevent DDoS
const telegramWebhookRateLimiterConfig = rateLimit({
  windowMs: 1 * 60 * 1000, 
  max: 300, 
  message: {
    success: false,
    message: 'Too many updates',
  },
});

// Conditional rate limiters: unlimited in development, enforced in production
export const apiRateLimiter =
  env.NODE_ENV === 'production' ? apiRateLimiterConfig : noOpRateLimiter;

export const authRateLimiter =
  env.NODE_ENV === 'production' ? authRateLimiterConfig : noOpRateLimiter;

export const receiptScanRateLimiter =
  env.NODE_ENV === 'production' ? receiptScanRateLimiterConfig : noOpRateLimiter;

export const telegramWebhookRateLimiter =
  env.NODE_ENV === 'production' ? telegramWebhookRateLimiterConfig : noOpRateLimiter;
