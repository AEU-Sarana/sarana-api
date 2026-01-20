import { Request, Response, NextFunction } from 'express';
import { logger } from '@src/shared/utils/logger';

export function loggingMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const startTime = Date.now();

  // Log request
  logger.info('Incoming request', {
    method: req.method,
    path: req.path,
    query: req.query,
    userId: req.user?.userId,
    ip: req.ip,
  });

  // Log response
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    logger.info('Request completed', {
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      userId: req.user?.userId,
    });
  });

  next();
}