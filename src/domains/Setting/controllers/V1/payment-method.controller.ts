import { Request, Response } from 'express';
import { PaymentMethodService } from '@src/domains/Setting/services/payment-method.service';
import { logger } from '@src/shared/utils/logger';

const paymentMethodService = new PaymentMethodService();

export class PaymentMethodController {
  static async listPaymentMethods(req: Request, res: Response): Promise<void> {
    try {
      const includeInactive = req.query.include_inactive === 'true' || req.query.all === 'true';
      const methods = await paymentMethodService.getAllPaymentMethods(includeInactive);

      res.status(200).json({
        success: true,
        data: methods,
        message: 'Payment methods retrieved successfully',
      });
    } catch (error: any) {
      logger.error('List payment methods error', { error: error.message });
      throw error;
    }
  }

  static async getPaymentMethod(req: Request, res: Response): Promise<void> {
    try {
      const id = parseInt(req.params.id as string, 10);
      const method = await paymentMethodService.getPaymentMethodById(id);

      res.status(200).json({
        success: true,
        data: method,
        message: 'Payment method retrieved successfully',
      });
    } catch (error: any) {
      logger.error('Get payment method error', { error: error.message });
      throw error;
    }
  }

  static async createPaymentMethod(req: Request, res: Response): Promise<void> {
    try {
      const method = await paymentMethodService.createPaymentMethod(req.body);

      res.status(201).json({
        success: true,
        data: method,
        message: 'Payment method created successfully',
      });
    } catch (error: any) {
      logger.error('Create payment method error', { error: error.message });
      throw error;
    }
  }

  static async updatePaymentMethod(req: Request, res: Response): Promise<void> {
    try {
      const id = parseInt(req.params.id as string, 10);
      const method = await paymentMethodService.updatePaymentMethod(id, req.body);

      res.status(200).json({
        success: true,
        data: method,
        message: 'Payment method updated successfully',
      });
    } catch (error: any) {
      logger.error('Update payment method error', { error: error.message });
      throw error;
    }
  }

  static async toggleStatus(req: Request, res: Response): Promise<void> {
    try {
      const id = parseInt(req.params.id as string, 10);
      const method = await paymentMethodService.togglePaymentMethodStatus(id);

      res.status(200).json({
        success: true,
        data: method,
        message: `Payment method ${method.isActive ? 'activated' : 'deactivated'} successfully`,
      });
    } catch (error: any) {
      logger.error('Toggle payment method status error', { error: error.message });
      throw error;
    }
  }

  static async deletePaymentMethod(req: Request, res: Response): Promise<void> {
    try {
      const id = parseInt(req.params.id as string, 10);
      const result = await paymentMethodService.deletePaymentMethod(id);

      res.status(200).json({
        success: true,
        message: result.message,
      });
    } catch (error: any) {
      logger.error('Delete payment method error', { error: error.message });
      throw error;
    }
  }
}
