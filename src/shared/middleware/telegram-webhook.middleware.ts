import { Request, Response, NextFunction } from 'express';
import { logger } from '@src/shared/utils/logger';
import { safeCompare } from '@src/shared/utils/security.utils';

/**
 * Middleware to verify Telegram Webhook Secret Token
 * Ensures that the request is coming from Telegram
 */
export const telegramWebhookSecretMiddleware = (req: Request, res: Response, next: NextFunction) => {
    const secretToken = process.env.TELEGRAM_WEBHOOK_SECRET;

    // If no secret is configured, warn but allow (during setup)
    if (!secretToken) {
        logger.warn('TELEGRAM_WEBHOOK_SECRET is not configured in .env. Webhook is insecure!');
        return next();
    }

    const receivedToken = req.headers['x-telegram-bot-api-secret-token'];

    if (typeof receivedToken !== 'string' || !safeCompare(receivedToken, secretToken)) {
        logger.warn('Unauthorized webhook access attempt blocked', {
            ip: req.ip,
            userAgent: req.headers['user-agent']
        });
        return res.status(403).json({ success: false, message: 'Unauthorized' });
    }

    next();
};
