import { Request, Response, NextFunction } from 'express';
import { auditLogService } from '@src/shared/services/audit-log.service';

const MUTATION_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

export function auditMutationMiddleware(req: Request, res: Response, next: NextFunction): void {
  if (!MUTATION_METHODS.has(req.method)) {
    next();
    return;
  }

  res.on('finish', () => {
    const userId = req.user?.userId;
    const action = `API_MUTATION_${req.method}`;

    void auditLogService.createAuditLog({
      userId,
      action,
      resource: 'API',
      details: {
        method: req.method,
        path: req.originalUrl,
        status: res.statusCode,
        success: res.statusCode < 400,
      },
      ipAddress: req.ip,
      userAgent: req.get('user-agent') || undefined,
    });
  });

  next();
}
