import { Router, type IRouter } from 'express';
import { authenticateToken, requirePermission } from '@src/shared/middleware/auth.middleware';
import { validateRequest } from '@src/shared/middleware/validation.middleware';
import { StockController } from '@src/domains/Stock/controllers/V1/stock.controller';
import { nearExpiryValidator } from '../../validators/V1';

const router: IRouter = Router();

router.use(authenticateToken);

router.get(
  '/near-expiry',
  requirePermission('stock.view', 'read'),
  ...validateRequest(nearExpiryValidator),
  StockController.getNearExpiry
);

router.get(
  '/expired',
  requirePermission('stock.view', 'read'),
  StockController.getExpired
);

export default router;
