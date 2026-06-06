import type { Request, Response, NextFunction } from 'express';
import { convertDatesToPhnomPenh } from '@src/shared/utils/timezone';

export function responseTimezoneMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const originalJson = res.json.bind(res);

  res.json = ((body: unknown) => {
    const transformed = convertDatesToPhnomPenh(body);
    return originalJson(transformed);
  }) as Response['json'];

  next();
}