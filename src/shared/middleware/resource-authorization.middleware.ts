import { Request, Response, NextFunction } from 'express';
import { Role } from '@src/shared/config/permissions';
import prisma from '@src/database/client';

/**
 * Middleware to authorize order access
 * - Admin can access all orders within tenant
 * - Seller can only access own orders
 */
export async function authorizeOrderAccess(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  if (!req.user) {
    res.status(401).json({
      success: false,
      message: 'Authentication required',
      code: 'AUTH_REQUIRED',
    });
    return;
  }

  const orderIdParam = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const orderId = parseInt(orderIdParam || '', 10);
  if (isNaN(orderId) || !orderIdParam) {
    res.status(400).json({
      success: false,
      message: 'Invalid order ID',
      code: 'INVALID_ORDER_ID',
    });
    return;
  }

  try {
    const order = await prisma.order.findUnique({
      where: { orderId },
    });

    if (!order) {
      res.status(404).json({
        success: false,
        message: 'Order not found',
        code: 'ORDER_NOT_FOUND',
      });
      return;
    }

    // Admin can access all orders within tenant
    if (req.user.role === Role.ADMIN) {
      if (req.user.tenantId != null && order.tenantId === req.user.tenantId) {
        req.order = order;
        return next();
      }

      res.status(403).json({
        success: false,
        message: 'Access denied to this order',
        code: 'ORDER_ACCESS_DENIED',
      });
      return;
    }

    // Seller can only access own orders
    if (order.sellerId === req.user.userId) {
      req.order = order;
      return next();
    }

    res.status(403).json({
      success: false,
      message: 'Access denied to this order',
      code: 'ORDER_ACCESS_DENIED',
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Middleware to authorize shift access
 * - Admin can access all shifts
 * - Seller can only access own shifts
 */
export async function authorizeShiftAccess(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  if (!req.user) {
    res.status(401).json({
      success: false,
      message: 'Authentication required',
      code: 'AUTH_REQUIRED',
    });
    return;
  }

  const shiftIdParam = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const shiftId = parseInt(shiftIdParam || '', 10);
  if (isNaN(shiftId) || !shiftIdParam) {
    res.status(400).json({
      success: false,
      message: 'Invalid shift ID',
      code: 'INVALID_SHIFT_ID',
    });
    return;
  }

  try {
    const shift = await prisma.shift.findUnique({
      where: { shiftId },
    });

    if (!shift) {
      res.status(404).json({
        success: false,
        message: 'Shift not found',
        code: 'SHIFT_NOT_FOUND',
      });
      return;
    }

    // Admin can access all shifts
    if (req.user.role === Role.ADMIN) {
      req.shift = shift;
      return next();
    }

    // Seller can only access own shifts
    if (shift.sellerId === req.user.userId) {
      req.shift = shift;
      return next();
    }

    res.status(403).json({
      success: false,
      message: 'Access denied to this shift',
      code: 'SHIFT_ACCESS_DENIED',
    });
  } catch (error) {
    next(error);
  }
}
