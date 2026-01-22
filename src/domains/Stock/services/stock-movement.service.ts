import prisma from '@src/database/client';
import { StockMovementType } from '@src/domains/Stock/enums/stock-movement-type.enum';
import {
  GetStockMovementsRequest,
  GetStockMovementsResponse,
} from '@src/domains/Stock/types/stock.types';
import { auditLogService } from '@src/shared/services/audit-log.service';

export class StockMovementService {
  /**
   * Get stock movements (history)
   */
  static async getStockMovements(
    request: GetStockMovementsRequest,
    currentUserId: number
  ): Promise<GetStockMovementsResponse> {
    const {
      product_id,
      movement_type,
      date_from,
      date_to,
      page = 1,
      limit = 50,
    } = request;

    const where: any = {};

    if (product_id) where.productId = product_id;
    if (movement_type) where.movementType = movement_type;

    if (date_from || date_to) {
      where.createdAt = {};
      if (date_from) where.createdAt.gte = new Date(date_from);
      if (date_to) where.createdAt.lte = new Date(date_to);
    }

    const total = await prisma.stockMovement.count({ where });
    const skip = (page - 1) * limit;

    const movements = await prisma.stockMovement.findMany({
      where,
      skip,
      take: limit,
      include: {
        product: {
          select: {
            productId: true,
            productName: true,
            productCode: true,
          },
        },
        creator: {
          select: {
            userId: true,
            username: true,
            fullName: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    await auditLogService.createAuditLog({
      userId: currentUserId,
      action: 'VIEW_STOCK_MOVEMENTS',
      resource: 'StockMovement',
      details: { filters: { product_id, movement_type, date_from, date_to } },
    });

    return {
      movements: movements.map((m) => ({
        movement_id: m.movementId,
        product_id: m.productId,
        movement_type: m.movementType as StockMovementType,
        quantity: m.quantity,
        cost: m.cost ? Number(m.cost) : null,
        price: m.price ? Number(m.price) : null,
        supplier: m.supplier,
        reason: m.reason,
        order_id: m.orderId,
        shift_id: m.shiftId,
        created_by: m.createdBy,
        created_at: m.createdAt,
        product: {
          product_id: m.product.productId,
          product_name: m.product.productName,
          product_code: m.product.productCode,
        },
        created_by_user: {
          user_id: m.creator.userId,
          username: m.creator.username,
          full_name: m.creator.fullName,
        },
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
}

