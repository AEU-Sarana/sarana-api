import { Router, type IRouter } from 'express';
import { authenticateToken } from '@src/shared/middleware/auth.middleware';
import { requireAdmin } from '@src/shared/middleware/authorization.middleware';
import { PaymentMethodController } from '@src/domains/Setting/controllers/V1/payment-method.controller';

const router: IRouter = Router();

// All routes require authentication
router.use(authenticateToken);

// List payment methods (cashiers get active only by default, admin can pass include_inactive=true)
router.get('/', PaymentMethodController.listPaymentMethods);

// Get single payment method
router.get('/:id', PaymentMethodController.getPaymentMethod);

// Admin-only management endpoints
router.post('/', requireAdmin, PaymentMethodController.createPaymentMethod);
router.put('/:id', requireAdmin, PaymentMethodController.updatePaymentMethod);
router.patch('/:id/toggle', requireAdmin, PaymentMethodController.toggleStatus);
router.delete('/:id', requireAdmin, PaymentMethodController.deletePaymentMethod);

export default router;
