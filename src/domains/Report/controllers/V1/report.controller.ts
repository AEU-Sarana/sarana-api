import { Request, Response } from 'express';

import { logger } from '@src/shared/utils/logger';
import { UserPayload } from '@src/shared/middleware/auth.middleware';
import { ReportService } from '@src/domains/Report/services/report.service';

// Helper function (same as StockController)
function getStringValue(value: any): string | undefined {
  if (!value) return undefined;
  if (Array.isArray(value)) return String(value[0]);
  return typeof value === 'string' ? value : String(value);
}

export class ReportController {

  /**
   * GET /api/v1/reports/daily
   */
  static async getDailyReport(req: Request, res: Response): Promise<void> {
    try {
      const user = req.user as UserPayload;

      const dateStr = getStringValue(req.query.date);
      const sellerIdStr = getStringValue(req.query.seller_id);

      logger.info('Get daily report request', {
        userId: user.userId,
        date: dateStr,
        sellerId: sellerIdStr,
        path: req.path,
      });

      const request = {
        date: dateStr!,
        seller_id: sellerIdStr ? parseInt(sellerIdStr, 10) : undefined,
      };

      const response = await ReportService.getDailyReport(request, user.userId);

      res.status(200).json({
        success: true,
        data: response,
        message: 'Daily report retrieved successfully',
      });
    } catch (error: any) {
      logger.error('Get daily report error', {
        error: error.message,
        stack: error.stack,
      });
      throw error;
    }
  }

  /**
   * GET /api/v1/reports/sales
   */
  static async getSalesHistoryReport(req: Request, res: Response): Promise<void> {
    try {
      const user = req.user as UserPayload;

      const request = {
        start_date: getStringValue(req.query.start_date)!,
        end_date: getStringValue(req.query.end_date)!,
        seller_id: getStringValue(req.query.seller_id)
          ? parseInt(getStringValue(req.query.seller_id)!, 10)
          : undefined,
        product_id: getStringValue(req.query.product_id)
          ? parseInt(getStringValue(req.query.product_id)!, 10)
          : undefined,
        page: getStringValue(req.query.page)
          ? parseInt(getStringValue(req.query.page)!, 10)
          : 1,
        limit: getStringValue(req.query.limit)
          ? parseInt(getStringValue(req.query.limit)!, 10)
          : 20,
      };

      logger.info('Get sales history report request', {
        userId: user.userId,
        filters: request,
        path: req.path,
      });

      const response = await ReportService.getSalesHistoryReport(request, user.userId);

      res.status(200).json({
        success: true,
        data: response,
        message: 'Sales history retrieved successfully',
      });
    } catch (error: any) {
      logger.error('Get sales history report error', {
        error: error.message,
        stack: error.stack,
      });
      throw error;
    }
  }

  /**
   * GET /api/v1/reports/stock
   */
  static async getStockReport(req: Request, res: Response): Promise<void> {
    try {
      const user = req.user as UserPayload;

      const lowStockOnlyStr = getStringValue(req.query.low_stock_only);

      const request = {
        low_stock_only: lowStockOnlyStr === 'true',
      };

      logger.info('Get stock report request', {
        userId: user.userId,
        lowStockOnly: request.low_stock_only,
        path: req.path,
      });

      const response = await ReportService.getStockReport(request, user.userId);

      res.status(200).json({
        success: true,
        data: response,
        message: 'Stock report retrieved successfully',
      });
    } catch (error: any) {
      logger.error('Get stock report error', {
        error: error.message,
        stack: error.stack,
      });
      throw error;
    }
  }

  /**
   * POST /api/v1/reports/export
   */
  static async exportReport(req: Request, res: Response): Promise<void> {
    try {
      const user = req.user as UserPayload;

      logger.info('Export report request', {
        userId: user.userId,
        body: req.body,
      });

      const response = await ReportService.exportReport(req.body, user.userId);

      res.status(200).json({
        success: true,
        data: response,
        message: 'Report exported successfully',
      });
    } catch (error: any) {
      logger.error('Export report error', {
        error: error.message,
        stack: error.stack,
      });
      throw error;
    }
  }
}
