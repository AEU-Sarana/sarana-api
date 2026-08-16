import { Router, type IRouter } from 'express';
import { authenticateToken, requirePermission } from '@src/shared/middleware/auth.middleware';
import { validateRequest } from '@src/shared/middleware/validation.middleware';
import { OrderController } from '@src/domains/Order/controllers/V1/order.controller';
import {
  listOrdersValidator,
  getOrderValidator,
  createOrderValidator,
} from '@src/domains/Order/validators/V1/index';

const router: IRouter = Router();

// All routes require authentication
router.use(authenticateToken);

// Create simple online order - permission guarded
router.post(
  '/',
  requirePermission('pos.checkout', 'create'),
  ...validateRequest(createOrderValidator),
  OrderController.createOrder
);

// List orders - permission guarded
router.get(
  '/',
  requirePermission('sales.view_history', 'read'),
  ...validateRequest(listOrdersValidator),
  OrderController.listOrders
);

// Get order details - permission guarded
router.get(
  '/:id',
  requirePermission('sales.view_history', 'read'),
  ...validateRequest(getOrderValidator),
  OrderController.getOrder
);

export default router;