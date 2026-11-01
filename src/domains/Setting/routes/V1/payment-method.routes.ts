import { Router, type IRouter } from 'express';
import { authenticateToken } from '@src/shared/middleware/auth.middleware';
import { requireAdministrator } from '@src/shared/middleware/authorization.middleware';
import { PaymentMethodController } from '@src/domains/Setting/controllers/V1/payment-method.controller';

const router: IRouter = Router();

// All routes require authentication
router.use(authenticateToken);

// List payment methods (cashiers get active only by default, admin can pass include_inactive=true)
router.get('/', PaymentMethodController.listPaymentMethods);

// Get single payment method
router.get('/:id', PaymentMethodController.getPaymentMethod);

// Administrator-only management endpoints
router.post('/', requireAdministrator, PaymentMethodController.createPaymentMethod);
router.put('/:id', requireAdministrator, PaymentMethodController.updatePaymentMethod);
router.patch('/:id/toggle', requireAdministrator, PaymentMethodController.toggleStatus);
router.delete('/:id', requireAdministrator, PaymentMethodController.deletePaymentMethod);

export default router;
