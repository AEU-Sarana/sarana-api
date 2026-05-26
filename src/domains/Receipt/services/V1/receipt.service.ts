import { Request, Response } from 'express';
import { ReceiptLinkService } from '@src/domains/Receipt/services/V1/receipt-link.service';
import { logger } from '@src/shared/utils/logger';

export class ReceiptLinkController {
  static async createReceiptLink(req: Request, res: Response): Promise<void> {
    try {
      const orderIdParam = Array.isArray(req.params.order_id)
        ? req.params.order_id[0]
        : req.params.order_id;
      const orderId = parseInt(orderIdParam, 10);
      const user = req.user as { userId: number };

      const data = await ReceiptLinkService.createReceiptLink(orderId, user.userId);

      res.status(200).json({
        success: true,
        data,
        message: 'Receipt link generated successfully',
      });
    } catch (error: any) {
      logger.error('Create receipt link error', { error: error.message });
      throw error;
    }
  }
}