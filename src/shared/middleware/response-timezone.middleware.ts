import type { Request, Response, NextFunction } from 'express';
import { addLocalDateTimeFields } from '@src/shared/utils/timezone';

export function responseTimezoneMiddleware(
  _req: Request,
  res: Response,
  next: NextFunction
) {
  const originalJson = res.json.bind(res);

  res.json = ((body: unknown) => {
    const transformed = addLocalDateTimeFields(body);
    return originalJson(transformed);
  }) as Response['json'];

  next();
}
