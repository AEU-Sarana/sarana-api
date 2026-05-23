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

    // Admin can access all orders
    if (req.user.role === Role.ADMIN) {
      req.order = order;
      return next();
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
