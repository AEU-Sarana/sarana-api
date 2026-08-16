import { Request, Response } from 'express';
import { POService } from '@src/domains/Purchasing/services/po.service';
import { POPDFService } from '@src/domains/Purchasing/services/po-pdf.service';
import { UserPayload } from '@src/shared/middleware/auth.middleware';

export class POController {
  static async listPOs(req: Request, res: Response): Promise<void> {
    try {
      const page = req.query.page ? parseInt(String(req.query.page), 10) : 1;
      const limit = req.query.limit ? parseInt(String(req.query.limit), 10) : 50;
      const supplierId = req.query.supplierId ? parseInt(String(req.query.supplierId), 10) : undefined;
      const status = typeof req.query.status === 'string' ? req.query.status : undefined;
      const search = typeof req.query.search === 'string' ? req.query.search : undefined;

      const result = await POService.listPOs({ page, limit, supplierId, status, search });
      res.status(200).json({
        success: true,
        data: result.pos,
        pagination: result.pagination,
        message: 'Purchase orders retrieved successfully',
      });
    } catch (error: any) {
      res.status(error.statusCode || 500).json({
        success: false,
        message: error.message || 'Failed to fetch purchase orders',
      });
    }
  }

  static async getPO(req: Request, res: Response): Promise<void> {
    try {
      const poId = parseInt(String(req.params.id), 10);
      const po = await POService.getPOById(poId);
      res.status(200).json({
        success: true,
        data: po,
        message: 'Purchase order retrieved successfully',
      });
    } catch (error: any) {
      res.status(error.statusCode || 500).json({
        success: false,
        message: error.message || 'Failed to fetch purchase order',
      });
    }
  }

  static async createPO(req: Request, res: Response): Promise<void> {
    try {
      const user = req.user as UserPayload;
      const po = await POService.createPO(req.body, user.userId);
      res.status(201).json({
        success: true,
        data: po,
        message: 'Purchase order created successfully',
      });
    } catch (error: any) {
      res.status(error.statusCode || 400).json({
        success: false,
        message: error.message || 'Failed to create purchase order',
      });
    }
  }

  static async updatePOStatus(req: Request, res: Response): Promise<void> {
    try {
      const user = req.user as UserPayload;
      const poId = parseInt(String(req.params.id), 10);
      const { status } = req.body;
      const po = await POService.updatePOStatus(poId, status, user.userId);
      res.status(200).json({
        success: true,
        data: po,
        message: `Purchase order status updated to ${status}`,
      });
    } catch (error: any) {
      res.status(error.statusCode || 400).json({
        success: false,
        message: error.message || 'Failed to update purchase order status',
      });
    }
  }

  static async downloadPOPDF(req: Request, res: Response): Promise<void> {
    try {
      const poId = parseInt(String(req.params.id), 10);
      const po = await POService.getPOById(poId);

      const pdfBuffer = await POPDFService.generatePOPDF({
        poNumber: po.poNumber,
        orderDate: po.orderDate,
        expectedDeliveryDate: po.expectedDeliveryDate,
        status: po.status,
        supplier: {
          companyName: po.supplier.companyName,
          contactPerson: po.supplier.contactPerson,
          phone: po.supplier.phone,
          email: po.supplier.email,
          address: po.supplier.address,
        },
        items: po.purchase_order_items.map((item: any) => ({
          productName: item.product.productName,
          productCode: item.product.productCode,
          orderedQuantity: item.orderedQuantity,
          unitCost: Number(item.unitCost),
          subtotal: Number(item.subtotal),
        })),
        subtotal: Number(po.subtotal),
        taxAmount: Number(po.taxAmount),
        discountAmount: Number(po.discountAmount),
        totalAmount: Number(po.totalAmount),
        notes: po.notes,
        createdByName: po.createdByUser?.fullName,
      });

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${po.poNumber}.pdf"`);
      res.send(pdfBuffer);
    } catch (error: any) {
      res.status(error.statusCode || 500).json({
        success: false,
        message: error.message || 'Failed to generate PDF',
      });
    }
  }

  static async recordGoodsReceived(req: Request, res: Response): Promise<void> {
    try {
      const user = req.user as UserPayload;
      const gr = await POService.recordGoodsReceived(req.body, user.userId);
      res.status(201).json({
        success: true,
        data: gr,
        message: 'Goods received and stock updated successfully',
      });
    } catch (error: any) {
      res.status(error.statusCode || 400).json({
        success: false,
        message: error.message || 'Failed to record goods received',
      });
    }
  }
}
