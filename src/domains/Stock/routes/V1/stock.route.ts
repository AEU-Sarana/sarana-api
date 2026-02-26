import { Router, type IRouter } from 'express';
import { authenticateToken } from '@src/shared/middleware/auth.middleware';
import { requireAdmin, requirePermission } from '@src/shared/middleware/authorization.middleware';
import { validateRequest } from '@src/shared/middleware/validation.middleware';
import { Permission } from '@src/shared/config/permissions';
import { StockController } from '@src/domains/Stock/controllers/V1/stock.controller';
import { getStockMovementsValidator, getStockValidator, stockAdjustValidator, stockInValidator, stockReturnValidator } from '../../validators/V1';

const router: IRouter = Router();

// All routes require authentication
router.use(authenticateToken);

// Get stock levels - All users
router.get(
  '/',
  requirePermission(Permission.STOCK_VIEW),
  ...validateRequest(getStockValidator),
  StockController.getStock
);

// Get stock movements - Admin only (MUST be before /:productId route)
router.get(
  '/movements',
  requireAdmin,
  requirePermission(Permission.STOCK_HISTORY_VIEW),
  ...validateRequest(getStockMovementsValidator),
  StockController.getStockMovements
);

// Stock In - Admin only
router.post(
  '/in',
  requireAdmin,
  requirePermission(Permission.STOCK_IN),
  ...validateRequest(stockInValidator),
  StockController.stockIn
);

// Stock Adjustment - Admin only + PIN required
router.post(
  '/adjust',
  requireAdmin,
  requirePermission(Permission.STOCK_ADJUST),
  ...validateRequest(stockAdjustValidator),
  StockController.stockAdjust
);

// Stock Return - Admin only
router.post(
  '/return',
  requireAdmin,
  requirePermission(Permission.STOCK_RETURN),
  ...validateRequest(stockReturnValidator),
  StockController.stockReturn
);

// Get stock for product - All users (MUST be last to avoid matching specific routes)
router.get(
  '/:productId',
  requirePermission(Permission.STOCK_VIEW),
  ...validateRequest(getStockValidator),
  StockController.getStock
);

export default router;