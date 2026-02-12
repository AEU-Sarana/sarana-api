import { Request, Response } from 'express';
import { OrderService } from '@src/domains/Order/services/order.service';
import { OrderSyncService } from '@src/domains/Order/services/order-sync.service';
import { logger } from '@src/shared/utils/logger';
import { UserPayload } from '@src/shared/middleware/auth.middleware';

export class OrderController {
  static async syncOrders(req: Request, res: Response): Promise<void> {
    try {
      const user = req.user as UserPayload;
      const response = await OrderSyncService.syncOrders(req.body, user.userId, user.tenantId);

      res.status(200).json({
        success: true,
        data: response,
        message: 'Orders synced successfully',
      });
    } catch (error: any) {
      logger.error('Sync orders error', { error: error.message });
      throw error;
    }
  }

  static async listOrders(req: Request, res: Response): Promise<void> {
    try {
      const user = req.user as UserPayload;
      const request = {
        page: req.query.page ? parseInt(req.query.page as string, 10) : 1,
        limit: req.query.limit ? parseInt(req.query.limit as string, 10) : 50,
        shift_id: req.query.shift_id ? parseInt(req.query.shift_id as string, 10) : undefined,
        seller_id: req.query.seller_id ? parseInt(req.query.seller_id as string, 10) : undefined,
        start_date: req.query.start_date as string,
        end_date: req.query.end_date as string,
      };

      const response = await OrderService.listOrders(request, user);

      res.status(200).json({
        success: true,
        data: response,
        message: 'Orders retrieved successfully',
      });
    } catch (error: any) {
      logger.error('List orders error', { error: error.message });
      throw error;
    }
  }

  static async getOrder(req: Request, res: Response): Promise<void> {
    try {
      const user = req.user as UserPayload;
      const orderId = parseInt(req.params.id as string, 10);

      const response = await OrderService.getOrder(orderId, user);

      res.status(200).json({
        success: true,
        data: response,
        message: 'Order retrieved successfully',
      });
    } catch (error: any) {
      logger.error('Get order error', { error: error.message });
      throw error;
    }
  }

  static async getSyncStatus(req: Request, res: Response): Promise<void> {
    try {
      const orderUuids = req.query.order_uuids
        ? (req.query.order_uuids as string).split(',')
        : [];

      const request = { order_uuids: orderUuids };
      const response = await OrderSyncService.getSyncStatus(request);

      res.status(200).json({
        success: true,
        data: response,
        message: 'Sync status retrieved',
      });
    } catch (error: any) {
      logger.error('Get sync status error', { error: error.message });
      throw error;
    }
  }
}
