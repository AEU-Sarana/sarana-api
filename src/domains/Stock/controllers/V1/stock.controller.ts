import { Request, Response } from 'express';
import { StockService } from '@src/domains/Stock/services/stock.service';
import { StockLotService } from '@src/domains/Stock/services/stock-lot.service';
import { StockMovementService } from '@src/domains/Stock/services/stock-movement.service';
import { logger } from '@src/shared/utils/logger';
import { UserPayload } from '@src/shared/middleware/auth.middleware';
import { GetStockMovementsRequest, GetStockRequest } from '../../types/stock.types';

// Helper function to safely extract string from query/param
function getStringValue(value: string | string[] | undefined): string | undefined {
  if (!value) return undefined;
  if (Array.isArray(value)) return value[0];
  return typeof value === 'string' ? value : String(value);
}

export class StockController {
  static async getStock(req: Request, res: Response): Promise<void> {
    try {
      const user = req.user as UserPayload;
      const productIdStr = getStringValue(req.params.productId);
      const stockVersionStr = getStringValue(req.query.stock_version as string | string[] | undefined);
      const statusStr = getStringValue(req.query.status as string | string[] | undefined);
      const categoryStr = getStringValue(req.query.category as string | string[] | undefined);
      const categoryIdStr = getStringValue(req.query.category_id as string | string[] | undefined);
      const searchStr = getStringValue(req.query.search as string | string[] | undefined);
      const pageStr = getStringValue(req.query.page as string | string[] | undefined);
      const limitStr = getStringValue(req.query.limit as string | string[] | undefined);
      const barcodeStr = getStringValue(req.query.barcode as string | string[] | undefined);
      const productStatusStr = getStringValue(req.query.product_status as string | string[] | undefined);

      logger.info('Get stock request', {
        productId: productIdStr,
        userId: user.userId,
        path: req.path,
        url: req.url,
        filters: { stock_version: stockVersionStr, status: statusStr, category: categoryStr, category_id: categoryIdStr, search: searchStr, barcode: barcodeStr, product_status: productStatusStr },
      });

      const normalize = (v?: string) => (v && v.trim() !== '' ? v.trim() : undefined);

      const request: GetStockRequest = {
        product_id: productIdStr ? parseInt(productIdStr, 10) : undefined,
        version: normalize(stockVersionStr) ? parseInt(stockVersionStr!, 10) : undefined,
        status: statusStr as 'in_stock' | 'low_stock' | 'out_of_stock' | 'negative' | undefined,
        category: categoryStr,
        category_id: categoryIdStr ? parseInt(categoryIdStr, 10) : undefined,
        search: searchStr,
        barcode: barcodeStr,
        page: pageStr ? parseInt(pageStr, 10) : 1,
        limit: limitStr ? parseInt(limitStr, 10) : 50,
        product_status: productStatusStr as any,
      };

      const response = await StockService.getStock(request, user.userId);

      logger.info('Get stock response', {
        productId: request.product_id,
        isSingleStock: !!request.product_id,
        hasStocks: 'stocks' in response,
      });

      res.status(200).json({
        success: true,
        data: response,
        message: 'Stock retrieved successfully',
      });
    } catch (error: any) {
      logger.error('Get stock error', {
        error: error.message,
        stack: error.stack,
        productId: req.params.productId,
      });
      throw error;
    }
  }

  static async stockIn(req: Request, res: Response): Promise<void> {
    try {
      const user = req.user as UserPayload;
      const request = {
        product_id: req.body.product_id,
        quantity: req.body.quantity,
        cost: req.body.cost,
        supplier: req.body.supplier,
        date: req.body.date ? new Date(req.body.date) : undefined,
        received_at: req.body.received_at ? new Date(req.body.received_at) : undefined,
        expired_at: req.body.expired_at ? new Date(req.body.expired_at) : undefined,
      };

      const response = await StockService.stockIn(request, user.userId);

      res.status(201).json({
        success: true,
        data: response,
        message: 'Stock added successfully',
      });
    } catch (error: any) {
      logger.error('Stock In error', { error: error.message });
      throw error;
    }
  }

  static async stockAdjust(req: Request, res: Response): Promise<void> {
    try {
      const user = req.user as UserPayload;
      const request = {
        product_id: req.body.product_id,
        quantity: req.body.quantity,
        reason: req.body.reason,
      };

      const response = await StockService.stockAdjust(request, user.userId);

      res.status(201).json({
        success: true,
        data: response,
        message: 'Stock adjusted successfully',
      });
    } catch (error: any) {
      logger.error('Stock adjust error', { error: error.message });
      throw error;
    }
  }

  static async stockReturn(req: Request, res: Response): Promise<void> {
    try {
      const user = req.user as UserPayload;
      const request = {
        product_id: req.body.product_id,
        quantity: req.body.quantity,
        order_id: req.body.order_id,
        reason: req.body.reason,
      };

      const response = await StockService.stockReturn(request, user.userId);

      res.status(201).json({
        success: true,
        data: response,
        message: 'Stock returned successfully',
      });
    } catch (error: any) {
      logger.error('Stock return error', { error: error.message });
      throw error;
    }
  }

  static async getStockMovements(req: Request, res: Response): Promise<void> {
    try {
      const user = req.user as UserPayload;
      const productIdStr = getStringValue(req.query.product_id as string | string[] | undefined);
      const pageStr = getStringValue(req.query.page as string | string[] | undefined);
      const limitStr = getStringValue(req.query.limit as string | string[] | undefined);

      const request: GetStockMovementsRequest = {
        product_id: productIdStr ? parseInt(productIdStr, 10) : undefined,
        movement_type: getStringValue(req.query.movement_type as string | string[] | undefined),
        date_from: getStringValue(req.query.date_from as string | string[] | undefined),
        date_to: getStringValue(req.query.date_to as string | string[] | undefined),
        product_name: getStringValue(req.query.product_name as string | string[] | undefined),
        barcode: getStringValue(req.query.barcode as string | string[] | undefined),
        page: pageStr ? parseInt(pageStr, 10) : 1,
        limit: limitStr ? parseInt(limitStr, 10) : 50,
      };

      const response = await StockMovementService.getStockMovements(request, user.userId);

      res.status(200).json({
        success: true,
        data: response,
        message: 'Stock movements retrieved',
      });
    } catch (error: any) {
      logger.error('Get stock movements error', { error: error.message });
      throw error;
    }
  }

  static async getNearExpiry(req: Request, res: Response): Promise<void> {
    try {
      const user = req.user as UserPayload;
      const days = req.query.days ? parseInt(String(req.query.days), 10) : 30;
      const response = await StockLotService.listNearExpiry(days);
      res.status(200).json({
        success: true,
        data: response,
        message: 'Near expiry lots retrieved',
      });
    } catch (error: any) {
      logger.error('Get near expiry lots error', { error: error.message });
      throw error;
    }
  }

  static async getExpired(req: Request, res: Response): Promise<void> {
    try {
      const user = req.user as UserPayload;
      const response = await StockLotService.listExpired();
      res.status(200).json({
        success: true,
        data: response,
        message: 'Expired lots retrieved',
      });
    } catch (error: any) {
      logger.error('Get expired lots error', { error: error.message });
      throw error;
    }
  }
}
