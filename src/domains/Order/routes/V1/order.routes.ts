import { Router, type IRouter } from 'express';
import { authenticateToken } from '@src/shared/middleware/auth.middleware';
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

// Create simple online order - All users
router.post(
  '/',
  ...validateRequest(createOrderValidator),
  OrderController.createOrder
);

// List orders - All users (role-based filtering)
router.get(
  '/',
  ...validateRequest(listOrdersValidator),
  OrderController.listOrders
);

// Get order details - All users (role-based access)
router.get(
  '/:id',
  ...validateRequest(getOrderValidator),
  OrderController.getOrder
);

export default router;