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

// List pending cancellation requests (Admin only)
router.get(
  '/cancellation-requests',
  requirePermission('sales.view_history', 'read'),
  OrderController.listCancellationRequests
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

// Request order cancellation (Cashier / Admin)
router.post(
  '/:id/request-cancel',
  requirePermission('sales.view_history', 'update'),
  ...validateRequest(getOrderValidator),
  OrderController.requestCancellation
);

// Approve order cancellation (Admin only)
router.post(
  '/:id/approve-cancel',
  requirePermission('sales.view_history', 'delete'),
  ...validateRequest(getOrderValidator),
  OrderController.approveCancellation
);

// Reject order cancellation (Admin only)
router.post(
  '/:id/reject-cancel',
  requirePermission('sales.view_history', 'delete'),
  ...validateRequest(getOrderValidator),
  OrderController.rejectCancellation
);

export default router;