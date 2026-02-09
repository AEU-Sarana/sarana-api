import type { Request, Response, NextFunction } from 'express';
import { convertDatesToPhnomPenh } from '@src/shared/utils/timezone';

const SHOULD_SKIP_CLOSE_SHIFT_REGEX = /\/shifts\/[^/]+\/close\/?$/;

function shouldSkipTimezoneTransform(req: Request): boolean {
  if (req.method !== 'POST') return false;
  const normalizedPath = req.path.split('?')[0];
  const normalizedOriginalUrl = req.originalUrl.split('?')[0];
  return (
    SHOULD_SKIP_CLOSE_SHIFT_REGEX.test(normalizedPath) ||
    SHOULD_SKIP_CLOSE_SHIFT_REGEX.test(normalizedOriginalUrl)
  );
}

export function responseTimezoneMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const originalJson = res.json.bind(res);

  res.json = ((body: unknown) => {
    if (shouldSkipTimezoneTransform(req)) {
      return originalJson(body);
    }
    const transformed = convertDatesToPhnomPenh(body);
    return originalJson(transformed);
  }) as Response['json'];

  next();
}