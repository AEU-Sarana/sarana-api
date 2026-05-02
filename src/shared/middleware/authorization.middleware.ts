import { Request, Response, NextFunction } from 'express';
import { Permission, Role, hasPermission } from '@src/shared/config/permissions';

/**
 * Middleware to require specific role(s)
 */
export function requireRole(...allowedRoles: Role[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'Authentication required',
        code: 'AUTH_REQUIRED',
      });
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      res.status(403).json({
        success: false,
        message: 'Insufficient permissions',
        code: 'INSUFFICIENT_PERMISSIONS',
        required: allowedRoles,
        current: req.user.role,
      });
      return;
    }

    next();
  };
}

/**
 * Middleware to require specific permission(s)
 */
export function requirePermission(...permissions: Permission[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'Authentication required',
        code: 'AUTH_REQUIRED',
      });
      return;
    }

    const userRole = req.user.role;
    const hasAllPermissions = permissions.every((permission) =>
      hasPermission(userRole, permission)
    );

    if (!hasAllPermissions) {
      res.status(403).json({
        success: false,
        message: 'Insufficient permissions',
        code: 'INSUFFICIENT_PERMISSIONS',
        required: permissions,
        current: userRole,
      });
      return;
    }

    next();
  };
}



/**
 * Middleware to require admin role
 */
export function requireAdmin(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  requireRole(Role.ADMIN)(req, res, next);
}

/**
 * Middleware to require admin or cashier role
 */
export function requireAdminOrCashier(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  requireRole(Role.ADMIN, Role.CASHIER)(req, res, next);
}

export const requireAdminOrSeller = requireAdminOrCashier;