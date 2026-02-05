import { Router, type IRouter } from 'express';
import { authenticateToken } from '@src/shared/middleware/auth.middleware';
import { requirePermission } from '@src/shared/middleware/authorization.middleware';
import { validateRequest } from '@src/shared/middleware/validation.middleware';
import { Permission } from '@src/shared/config/permissions';
import { StockController } from '@src/domains/Stock/controllers/V1/stock.controller';
import { nearExpiryValidator } from '../../validators/V1';

const router: IRouter = Router();

router.use(authenticateToken);

router.get(
  '/near-expiry',
  requirePermission(Permission.STOCK_VIEW),
  ...validateRequest(nearExpiryValidator),
  StockController.getNearExpiry
);

router.get(
  '/expired',
  requirePermission(Permission.STOCK_VIEW),
  StockController.getExpired
);

export default router;
