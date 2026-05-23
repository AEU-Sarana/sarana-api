import prisma from '@src/database/client';
import { StockMovementType } from '@src/domains/Stock/enums/stock-movement-type.enum';
import {
  GetStockMovementsRequest,
  GetStockMovementsResponse,
  StockMovementResponse,
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
      barcode,
      product_name,
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

    if (barcode || product_name) {
      where.product = {};
      if (barcode) {
        where.product.barcode = { contains: barcode, mode: 'insensitive' };
      }
      if (product_name) {
        where.product.productName = { contains: product_name, mode: 'insensitive' };
      }
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
            barcode: true,
            imagePath: true,
          },
        },
        stockLot: {
          select: {
            expiredAt: true,
          },
        },
        user: {
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
      details: { filters: { product_id, movement_type, date_from, date_to, barcode, product_name } },
    });

    return {
      movements: movements.map((m) => ({
        movement_id: m.movementId,
        product_id: m.productId,
        product_name: m.product.productName,
        barcode: m.product.barcode,
        movement_type: m.movementType as StockMovementType,
        quantity: m.quantity,
        cost: m.cost ? Number(m.cost) : null,
        supplier: m.supplier,
        image_path: m.product.imagePath,
        expired_at: m.stockLot?.expiredAt,
        created_at: m.createdAt,
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