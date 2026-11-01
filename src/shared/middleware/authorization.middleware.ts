import { Request, Response, NextFunction } from 'express';
import { Permission, Role, hasPermission } from '@src/shared/config/permissions';

/**
 * Middleware to require specific role(s)
 */
export function requireRole(...allowedRoles: (Role | string)[]) {
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
      hasPermission(userRole as Role, permission)
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
 * Middleware to require administrator role (Super Admin)
 */
export function requireAdministrator(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const roleUpper = (req.user?.role || '').toUpperCase();
  if (roleUpper === 'ADMINISTRATOR' || roleUpper === 'SUPER_ADMIN') {
    next();
    return;
  }
  res.status(403).json({
    success: false,
    message: 'Administrator clearance required',
    code: 'FORBIDDEN_ADMINISTRATOR_ONLY',
  });
}

/**
 * Middleware to require admin role (Administrator or Admin)
 */
export function requireAdmin(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  requireRole(Role.ADMINISTRATOR, Role.ADMIN, 'SUPER_ADMIN')(req, res, next);
}

/**
 * Middleware to require admin or cashier role
 */
export function requireAdminOrCashier(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  requireRole(Role.ADMINISTRATOR, Role.ADMIN, Role.CASHIER, 'SUPER_ADMIN')(req, res, next);
}

export const requireAdminOrSeller = requireAdminOrCashier;