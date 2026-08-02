import { Router, type IRouter } from 'express';
import { authenticateToken, requirePermission } from '@src/shared/middleware/auth.middleware';
import { validateRequest } from '@src/shared/middleware/validation.middleware';
import { StockController } from '@src/domains/Stock/controllers/V1/stock.controller';
import { getStockMovementsValidator, getStockValidator, stockAdjustValidator, stockInValidator, stockReturnValidator } from '../../validators/V1';

const router: IRouter = Router();

// All routes require authentication
router.use(authenticateToken);

// Get stock levels
router.get(
  '/',
  requirePermission('stock.view', 'read'),
  ...validateRequest(getStockValidator),
  StockController.getStock
);

// Get stock movements (MUST be before /:productId route)
router.get(
  '/movements',
  requirePermission('stock.view', 'read'),
  ...validateRequest(getStockMovementsValidator),
  StockController.getStockMovements
);

// Stock In
router.post(
  '/in',
  requirePermission('stock.stock_in', 'create'),
  ...validateRequest(stockInValidator),
  StockController.stockIn
);

// Stock Adjustment
router.post(
  '/adjust',
  requirePermission('stock.adjustments', 'create'),
  ...validateRequest(stockAdjustValidator),
  StockController.stockAdjust
);

// Stock Return
router.post(
  '/return',
  requirePermission('stock.adjustments', 'create'),
  ...validateRequest(stockReturnValidator),
  StockController.stockReturn
);

// Get stock for product
router.get(
  '/:productId',
  requirePermission('stock.view', 'read'),
  ...validateRequest(getStockValidator),
  StockController.getStock
);

export default router;