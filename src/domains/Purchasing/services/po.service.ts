import prisma from '@src/database/client';
import { NotFoundException, ValidationException } from '@src/shared/exceptions';
import { StockService } from '@src/domains/Stock/services/stock.service';
import { auditLogService } from '@src/shared/services/audit-log.service';

export interface CreatePOItemInput {
  productId: number;
  orderedQuantity: number;
  unitCost: number;
  notes?: string;
}

export interface CreatePOInput {
  supplierId: number;
  expectedDeliveryDate?: string;
  taxAmount?: number;
  discountAmount?: number;
  notes?: string;
  status?: 'DRAFT' | 'APPROVED';
  items: CreatePOItemInput[];
}

export interface UpdatePOInput {
  supplierId?: number;
  expectedDeliveryDate?: string;
  taxAmount?: number;
  discountAmount?: number;
  notes?: string;
  items?: CreatePOItemInput[];
}

export interface RecordGoodsReceivedItemInput {
  poItemId?: number;
  productId: number;
  quantityReceived: number;
  unitCost: number;
  batchNumber?: string;
  expiryDate?: string;
}

export interface RecordGoodsReceivedInput {
  poId?: number;
  supplierId: number;
  receivedDate?: string;
  invoiceNumber?: string;
  notes?: string;
  items: RecordGoodsReceivedItemInput[];
}

export class POService {
  static generatePONumber(): string {
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
    return `PO-${dateStr}-${rand}`;
  }

  static generateGRNumber(): string {
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
    return `GR-${dateStr}-${rand}`;
  }

  static async listPOs(params: {
    page?: number;
    limit?: number;
    supplierId?: number;
    status?: string;
    search?: string;
  }) {
    const page = params.page && params.page > 0 ? params.page : 1;
    const limit = params.limit && params.limit > 0 ? params.limit : 50;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (params.supplierId) where.supplierId = params.supplierId;
    if (params.status) where.status = params.status;
    if (params.search) {
      where.OR = [
        { poNumber: { contains: params.search, mode: 'insensitive' } },
        { supplier: { companyName: { contains: params.search, mode: 'insensitive' } } },
      ];
    }

    const [pos, total] = await Promise.all([
      prisma.purchaseOrder.findMany({
        where,
        skip,
        take: limit,
        orderBy: { orderDate: 'desc' },
        include: {
          supplier: {
            select: { supplierId: true, companyName: true, phone: true, email: true },
          },
          createdByUser: {
            select: { userId: true, fullName: true },
          },
          purchase_order_items: {
            include: {
              product: { select: { productId: true, productName: true, productCode: true } },
            },
          },
        },
      }),
      prisma.purchaseOrder.count({ where }),
    ]);

    return {
      pos,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  static async getPOById(poId: number) {
    const po = await prisma.purchaseOrder.findUnique({
      where: { poId: poId },
      include: {
        supplier: true,
        createdByUser: {
          select: { userId: true, fullName: true },
        },
        approvedByUser: {
          select: { userId: true, fullName: true },
        },
        purchase_order_items: {
          include: {
            product: {
              select: { productId: true, productName: true, productCode: true, barcode: true },
            },
          },
        },
        goods_received: {
          orderBy: { receivedDate: 'desc' },
          include: {
            goods_received_items: true,
            user: { select: { userId: true, fullName: true } },
          },
        },
      },
    });

    if (!po) {
      throw new NotFoundException('Purchase order not found');
    }

    return po;
  }

  static async createPO(input: CreatePOInput, userId: number) {
    if (!input.supplierId) {
      throw new ValidationException('Supplier is required');
    }
    if (!input.items || input.items.length === 0) {
      throw new ValidationException('Purchase order must have at least one item');
    }

    // Verify supplier
    const supplier = await prisma.supplier.findUnique({ where: { supplierId: input.supplierId } });
    if (!supplier || !supplier.isActive) {
      throw new ValidationException('Selected supplier is inactive or invalid');
    }

    let subtotal = 0;
    const validatedItems = [];

    for (const item of input.items) {
      if (!item.productId || item.orderedQuantity <= 0 || item.unitCost < 0) {
        throw new ValidationException('Invalid item details in purchase order');
      }
      const product = await prisma.product.findUnique({ where: { productId: item.productId } });
      if (!product) {
        throw new ValidationException(`Product ID ${item.productId} not found`);
      }

      const itemSubtotal = item.orderedQuantity * item.unitCost;
      subtotal += itemSubtotal;

      validatedItems.push({
        productId: item.productId,
        orderedQuantity: item.orderedQuantity,
        receivedQuantity: 0,
        unitCost: item.unitCost,
        subtotal: itemSubtotal,
        notes: item.notes || null,
      });
    }

    const taxAmount = input.taxAmount || 0;
    const discountAmount = input.discountAmount || 0;
    const totalAmount = subtotal + taxAmount - discountAmount;
    const poNumber = this.generatePONumber();
    const poStatus = input.status || 'DRAFT';

    const po = await prisma.purchaseOrder.create({
      data: {
        poNumber,
        supplierId: input.supplierId,
        status: poStatus,
        orderDate: new Date(),
        expectedDeliveryDate: input.expectedDeliveryDate ? new Date(input.expectedDeliveryDate) : null,
        subtotal,
        taxAmount,
        discountAmount,
        totalAmount,
        notes: input.notes || null,
        createdBy: userId,
        approvedBy: poStatus === 'APPROVED' ? userId : null,
        purchase_order_items: {
          create: validatedItems,
        },
      },
      include: {
        purchase_order_items: true,
      },
    });

    await auditLogService.createAuditLog({
      userId,
      action: 'CREATE_PURCHASE_ORDER',
      resource: 'PurchaseOrder',
      entityId: po.poId,
      details: { poNumber, totalAmount, supplierId: input.supplierId },
    });

    return po;
  }

  static async updatePOStatus(poId: number, status: 'APPROVED' | 'SENT' | 'CANCELLED', userId: number) {
    const po = await this.getPOById(poId);

    if (po.status === 'RECEIVED' || po.status === 'CANCELLED') {
      throw new ValidationException(`Cannot change status of a ${po.status} purchase order`);
    }

    const updated = await prisma.purchaseOrder.update({
      where: { poId },
      data: {
        status,
        ...(status === 'APPROVED' && { approvedBy: userId }),
        updatedAt: new Date(),
      },
    });

    await auditLogService.createAuditLog({
      userId,
      action: 'UPDATE_PO_STATUS',
      resource: 'PurchaseOrder',
      entityId: poId,
      details: { fromStatus: po.status, toStatus: status },
    });

    return updated;
  }

  static async recordGoodsReceived(input: RecordGoodsReceivedInput, userId: number) {
    if (!input.supplierId) {
      throw new ValidationException('Supplier is required for stock receiving');
    }
    if (!input.items || input.items.length === 0) {
      throw new ValidationException('Goods received must contain at least one item');
    }

    let po: any = null;
    if (input.poId) {
      po = await this.getPOById(input.poId);
      if (po.status === 'CANCELLED') {
        throw new ValidationException('Cannot receive goods against a cancelled purchase order');
      }
    }

    const grNumber = this.generateGRNumber();
    let totalReceivedAmount = 0;

    const grResult = await prisma.$transaction(async (tx) => {
      // Create goods_received record
      const newGR = await tx.goodsReceived.create({
        data: {
          grNumber,
          poId: input.poId || null,
          supplierId: input.supplierId,
          receivedDate: input.receivedDate ? new Date(input.receivedDate) : new Date(),
          invoiceNumber: input.invoiceNumber?.trim() || null,
          totalReceivedAmount: 0,
          notes: input.notes || null,
          receivedBy: userId,
        },
      });

      for (const item of input.items) {
        if (item.quantityReceived <= 0) continue;

        const lineSubtotal = item.quantityReceived * item.unitCost;
        totalReceivedAmount += lineSubtotal;

        // Create goods_received_items record
        await tx.goodsReceivedItem.create({
          data: {
            grId: newGR.grId,
            poItemId: item.poItemId || null,
            productId: item.productId,
            quantityReceived: item.quantityReceived,
            unitCost: item.unitCost,
            batchNumber: item.batchNumber?.trim() || null,
            expiryDate: item.expiryDate ? new Date(item.expiryDate) : null,
            subtotal: lineSubtotal,
          },
        });

        // If linked to PO item, update po_item received_quantity
        if (item.poItemId) {
          await tx.purchaseOrderItem.update({
            where: { poItemId: item.poItemId },
            data: {
              receivedQuantity: { increment: item.quantityReceived },
            },
          });
        }

        // Perform Stock In using StockService to create stock_lots & stock_movements
        await StockService.stockIn(
          {
            product_id: item.productId,
            quantity: item.quantityReceived,
            cost: item.unitCost,
            expired_at: item.expiryDate ? new Date(item.expiryDate) : undefined,
            note: input.notes || `Stock In via GR #${grNumber}`,
          },
          userId
        );

        // Update product's last purchase cost
        await tx.product.update({
          where: { productId: item.productId },
          data: { lastPurchaseCost: item.unitCost },
        });
      }

      // Update total received amount on GR
      await tx.goodsReceived.update({
        where: { grId: newGR.grId },
        data: { totalReceivedAmount },
      });

      // Update PO Status if linked to PO
      if (input.poId) {
        const poItems = await tx.purchaseOrderItem.findMany({
          where: { poId: input.poId },
        });

        let totalOrdered = 0;
        let totalReceived = 0;

        poItems.forEach((pi: any) => {
          totalOrdered += pi.orderedQuantity;
          totalReceived += pi.receivedQuantity;
        });

        let newPoStatus = po.status;
        if (totalReceived >= totalOrdered) {
          newPoStatus = 'RECEIVED';
        } else if (totalReceived > 0) {
          newPoStatus = 'PARTIAL_RECEIVED';
        }

        await tx.purchaseOrder.update({
          where: { poId: input.poId },
          data: { status: newPoStatus, updatedAt: new Date() },
        });
      }

      return newGR.grId;
    });

    await auditLogService.createAuditLog({
      userId,
      action: 'RECORD_GOODS_RECEIVED',
      resource: 'GoodsReceived',
      entityId: grResult,
      details: { grNumber, totalReceivedAmount, poId: input.poId },
    });

    return await prisma.goodsReceived.findUnique({
      where: { grId: grResult },
      include: {
        goods_received_items: {
          include: { product: { select: { productId: true, productName: true } } },
        },
        supplier: true,
      },
    });
  }
}
