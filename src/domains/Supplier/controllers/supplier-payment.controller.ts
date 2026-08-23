import { Request, Response } from 'express';
import { SupplierPaymentService } from '../services/supplier-payment.service';
import { logger } from '@src/shared/utils/logger';

export class SupplierPaymentController {
  /**
   * GET /api/v1/suppliers/debts - Get supplier debt metrics and breakdown
   */
  static async getDebtOverview(req: Request, res: Response) {
    try {
      const overview = await SupplierPaymentService.getSupplierDebtOverview();
      return res.json({
        success: true,
        data: overview,
      });
    } catch (error: any) {
      logger.error('Failed to get supplier debt overview', { error: error.message });
      return res.status(500).json({ success: false, message: error.message });
    }
  }

  /**
   * POST /api/v1/suppliers/payments - Record payment to supplier
   */
  static async recordPayment(req: Request, res: Response) {
    try {
      const user = (req as any).user;
      const { supplier_id, po_id, amount, payment_method, reference_number, notes, payment_date } = req.body;

      const payment = await SupplierPaymentService.recordPayment(
        {
          supplierId: Number(supplier_id),
          poId: po_id ? Number(po_id) : undefined,
          amount: Number(amount),
          paymentMethod: payment_method,
          referenceNumber: reference_number,
          notes,
          paymentDate: payment_date,
        },
        user.userId
      );

      return res.status(201).json({
        success: true,
        message: 'Supplier payment recorded successfully',
        data: payment,
      });
    } catch (error: any) {
      logger.error('Failed to record supplier payment', { error: error.message });
      return res.status(400).json({ success: false, message: error.message });
    }
  }

  /**
   * GET /api/v1/suppliers/payments - Get supplier payment history
   */
  static async getPaymentHistory(req: Request, res: Response) {
    try {
      const { supplier_id, po_id, page, limit } = req.query;
      const result = await SupplierPaymentService.getPaymentHistory({
        supplierId: supplier_id ? Number(supplier_id) : undefined,
        poId: po_id ? Number(po_id) : undefined,
        page: page ? Number(page) : 1,
        limit: limit ? Number(limit) : 50,
      });

      return res.json({
        success: true,
        data: result,
      });
    } catch (error: any) {
      logger.error('Failed to get supplier payment history', { error: error.message });
      return res.status(500).json({ success: false, message: error.message });
    }
  }
}
