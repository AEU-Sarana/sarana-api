import { Request, Response } from 'express';
import { OrderService } from '@src/domains/Order/services/order.service';
import { logger } from '@src/shared/utils/logger';
import { UserPayload } from '@src/shared/middleware/auth.middleware';

export class OrderController {
  static async listOrders(req: Request, res: Response): Promise<void> {
    try {
      const user = req.user as UserPayload;
      const request = {
        page: req.query.page ? parseInt(req.query.page as string, 10) : 1,
        limit: req.query.limit ? parseInt(req.query.limit as string, 10) : 50,
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

  static async createOrder(req: Request, res: Response): Promise<void> {
    try {
      const user = req.user as UserPayload;
      const response = await OrderService.createOrder(req.body, user);

      res.status(201).json({
        success: true,
        data: response,
        message: 'Order created successfully',
      });
    } catch (error: any) {
      logger.error('Create order error', { error: error.message });
      throw error;
    }
  }
}
