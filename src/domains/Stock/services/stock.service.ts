import  prisma  from '@src/database/client';
import { StockMovementType } from '@src/domains/Stock/enums/stock-movement-type.enum';
import { ProductStatus } from '@src/domains/Product/enums/product-status.enum';
import {
  GetStockRequest,
  GetStockResponse,
  StockInRequest,
  StockInResponse,
  StockAdjustRequest,
  StockAdjustResponse,
  StockReturnRequest,
  StockReturnResponse,
} from '@src/domains/Stock/types/stock.types';
import { ValidationException, BusinessLogicException } from '@src/shared/exceptions';
import { logger } from '@src/shared/utils/logger';
import { auditLogService } from '@src/shared/services/audit-log.service';
import { eventBus } from '@src/shared/events/event-bus';

export class StockService {
  /**
   * Get stock levels (all products or by product_id)
   */
  static async getStock(
    request: GetStockRequest,
    currentUserId: number
  ): Promise<GetStockResponse> {
    const { product_id, version } = request;

    if (product_id) {
      // Get stock for specific product
      const stock = await prisma.stock.findUnique({
        where: { productId: product_id },
        include: { product: true },
      });

      if (!stock) {
        throw new ValidationException('Stock not found for product');
      }

      await auditLogService.createAuditLog({
        userId: currentUserId,
        action: 'VIEW_STOCK',
        resource: 'Stock',
        entityId: stock.stockId,
        details: { productId: product_id },
      });

      return {
        stock: {
          stock_id: stock.stockId,
          product_id: stock.productId,
          quantity: stock.quantity,
          stock_version: stock.stockVersion,
          last_sync_time: stock.lastSyncTime,
          updated_at: stock.updatedAt,
          product: {
            product_id: stock.product.productId,
            product_name: stock.product.productName,
            product_code: stock.product.productCode,
          },
        },
      };
    }

    // Get all stock levels (with pagination)
    const { page = 1, limit = 50 } = request;
    const where: any = {};

    if (version) {
      where.stockVersion = version;
    }

    const total = await prisma.stock.count({ where });
    const skip = (page - 1) * limit;

    const stocks = await prisma.stock.findMany({
      where,
      skip,
      take: limit,
      include: { product: true },
      orderBy: { updatedAt: 'desc' },
    });

    await auditLogService.createAuditLog({
      userId: currentUserId,
      action: 'LIST_STOCK',
      resource: 'Stock',
      details: { filters: { version } },
    });

    return {
      stocks: stocks.map((s) => ({
        stock_id: s.stockId,
        product_id: s.productId,
        quantity: s.quantity,
        stock_version: s.stockVersion,
        last_sync_time: s.lastSyncTime,
        updated_at: s.updatedAt,
        product: {
          product_id: s.product.productId,
          product_name: s.product.productName,
          product_code: s.product.productCode,
        },
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
      version: stocks[0]?.stockVersion || 1,
      last_sync_time: stocks[0]?.lastSyncTime || null,
    };
  }

  /**
   * Stock In (Admin only)
   * Adds stock and creates movement record
   */
  static async stockIn(
    request: StockInRequest,
    currentUserId: number
  ): Promise<StockInResponse> {
    const { product_id, quantity, cost, supplier, date } = request;

    // Validate product exists and is active
    const product = await prisma.product.findUnique({
      where: { productId: product_id },
    });

    if (!product || product.deactivatedDate || product.status !== ProductStatus.ACTIVE) {
      throw new ValidationException('Product not found or inactive');
    }

    // Validate quantity
    if (quantity <= 0) {
      throw new ValidationException('Quantity must be greater than 0');
    }

    // Get or create stock record
    let stock = await prisma.stock.findUnique({
      where: { productId: product_id },
    });

    if (!stock) {
      // Create stock record if doesn't exist
      stock = await prisma.stock.create({
        data: {
          productId: product_id,
          quantity: 0,
          stockVersion: 1,
          updatedAt: new Date(),
        },
      });
    }

    // Create stock movement
    const movement = await prisma.stockMovement.create({
      data: {
        productId: product_id,
        movementType: 'STOCK_IN',
        quantity: quantity,
        cost: cost,
        supplier: supplier,
        createdBy: currentUserId,
        createdAt: date || new Date(),
      },
    });

    // Update stock quantity
    const updatedStock = await prisma.stock.update({
      where: { productId: product_id },
      data: {
        quantity: stock.quantity + quantity,
        stockVersion: stock.stockVersion + 1,
        updatedAt: new Date(),
      },
    });

    await auditLogService.createAuditLog({
      userId: currentUserId,
      action: 'STOCK_IN',
      resource: 'Stock',
      entityId: stock.stockId,
      details: {
        productId: product_id,
        quantity: quantity,
        cost: cost,
        supplier: supplier,
        stockBefore: stock.quantity,
        stockAfter: updatedStock.quantity,
      },
    });

    logger.info('Stock In', {
      productId: product_id,
      quantity: quantity,
      userId: currentUserId,
    });

    // Emit event
    eventBus.emit('stock.updated', {
      product_id: product_id,
      quantity: updatedStock.quantity,
      stock_version: updatedStock.stockVersion,
      movement_type: 'STOCK_IN',
      updated_by: currentUserId,
      updated_at: updatedStock.updatedAt,
    });

    eventBus.emit('stock.movement.created', {
      movement_id: movement.movementId,
      product_id: product_id,
      movement_type: 'STOCK_IN',
      quantity: quantity,
      created_by: currentUserId,
      created_at: movement.createdAt,
    });

    return {
      movement_id: movement.movementId,
      product_id: product_id,
      movement_type: StockMovementType.STOCK_IN,
      quantity: quantity,
      cost: cost,
      supplier: supplier,
      stock: {
        stock_id: updatedStock.stockId,
        quantity: updatedStock.quantity,
        stock_version: updatedStock.stockVersion,
      },
      created_at: movement.createdAt,
    };
  }

  /**
   * Stock Adjustment (Admin only, PIN required)
   * Adjusts stock (can be positive or negative)
   */
  static async stockAdjust(
    request: StockAdjustRequest,
    currentUserId: number
  ): Promise<StockAdjustResponse> {
    const { product_id, quantity, reason, pin } = request;

    // Verify PIN (implement PIN verification service)
    const user = await prisma.user.findUnique({
      where: { userId: currentUserId },
    });

    if (!user || !user.pinHash) {
      throw new ValidationException('PIN not configured for user');
    }

    // Verify PIN (use bcrypt)
    const bcrypt = await import('bcrypt');
    const isValidPIN = await bcrypt.compare(pin, user.pinHash);

    if (!isValidPIN) {
      throw new ValidationException('Invalid PIN');
    }

    // Validate product exists and is active
    const product = await prisma.product.findUnique({
      where: { productId: product_id },
    });

    if (!product || product.deactivatedDate || product.status !== ProductStatus.ACTIVE) {
      throw new ValidationException('Product not found or inactive');
    }

    // Validate quantity (can be negative for decrease)
    if (quantity === 0) {
      throw new ValidationException('Quantity adjustment cannot be zero');
    }

    // Get stock record
    const stock = await prisma.stock.findUnique({
      where: { productId: product_id },
    });

    if (!stock) {
      throw new ValidationException('Stock not found for product');
    }

    // Check if adjustment would result in negative stock (optional business rule)
    const newQuantity = stock.quantity + quantity;
    // Note: System allows negative stock (oversell scenario), but you can add validation:
    // if (newQuantity < 0) {
    //   throw new BusinessLogicException('Stock adjustment would result in negative stock');
    // }

    // Create stock movement
    const movement = await prisma.stockMovement.create({
      data: {
        productId: product_id,
        movementType: 'ADJUSTMENT',
        quantity: quantity,
        reason: reason,
        createdBy: currentUserId,
        createdAt: new Date(),
      },
    });

    // Update stock quantity
    const updatedStock = await prisma.stock.update({
      where: { productId: product_id },
      data: {
        quantity: newQuantity,
        stockVersion: stock.stockVersion + 1,
        updatedAt: new Date(),
      },
    });

    await auditLogService.createAuditLog({
      userId: currentUserId,
      action: 'STOCK_ADJUSTMENT',
      resource: 'Stock',
      entityId: stock.stockId,
      details: {
        productId: product_id,
        quantity: quantity,
        reason: reason,
        stockBefore: stock.quantity,
        stockAfter: updatedStock.quantity,
        pinVerified: true,
      },
    });

    logger.info('Stock adjusted', {
      productId: product_id,
      quantity: quantity,
      reason: reason,
      userId: currentUserId,
    });

    // Emit events
    eventBus.emit('stock.updated', {
      product_id: product_id,
      quantity: updatedStock.quantity,
      stock_version: updatedStock.stockVersion,
      movement_type: 'ADJUSTMENT',
      updated_by: currentUserId,
      updated_at: updatedStock.updatedAt,
    });

    eventBus.emit('stock.movement.created', {
      movement_id: movement.movementId,
      product_id: product_id,
      movement_type: 'ADJUSTMENT',
      quantity: quantity,
      reason: reason,
      created_by: currentUserId,
      created_at: movement.createdAt,
    });

    return {
      movement_id: movement.movementId,
      product_id: product_id,
      movement_type: StockMovementType.ADJUSTMENT,
      quantity: quantity,
      reason: reason,
      stock: {
        stock_id: updatedStock.stockId,
        quantity: updatedStock.quantity,
        stock_version: updatedStock.stockVersion,
      },
      created_at: movement.createdAt,
    };
  }

  /**
   * Stock Return/Refund (Admin only)
   * Returns stock (increases quantity)
   */
  static async stockReturn(
    request: StockReturnRequest,
    currentUserId: number
  ): Promise<StockReturnResponse> {
    const { product_id, quantity, order_id, reason } = request;

    // Validate product exists and is active
    const product = await prisma.product.findUnique({
      where: { productId: product_id },
    });

    if (!product || product.deactivatedDate || product.status !== ProductStatus.ACTIVE) {
      throw new ValidationException('Product not found or inactive');
    }

    // Validate quantity
    if (quantity <= 0) {
      throw new ValidationException('Quantity must be greater than 0');
    }

    // Get or create stock record
    let stock = await prisma.stock.findUnique({
      where: { productId: product_id },
    });

    if (!stock) {
      stock = await prisma.stock.create({
        data: {
          productId: product_id,
          quantity: 0,
          stockVersion: 1,
          updatedAt: new Date(),
        },
      });
    }

    // Create stock movement
    const movement = await prisma.stockMovement.create({
      data: {
        productId: product_id,
        movementType: 'RETURN',
        quantity: quantity,
        orderId: order_id,
        reason: reason,
        createdBy: currentUserId,
        createdAt: new Date(),
      },
    });

    // Update stock quantity
    const updatedStock = await prisma.stock.update({
      where: { productId: product_id },
      data: {
        quantity: stock.quantity + quantity,
        stockVersion: stock.stockVersion + 1,
        updatedAt: new Date(),
      },
    });

    await auditLogService.createAuditLog({
      userId: currentUserId,
      action: 'STOCK_RETURN',
      resource: 'Stock',
      entityId: stock.stockId,
      details: {
        productId: product_id,
        quantity: quantity,
        orderId: order_id,
        reason: reason,
        stockBefore: stock.quantity,
        stockAfter: updatedStock.quantity,
      },
    });

    logger.info('Stock returned', {
      productId: product_id,
      quantity: quantity,
      orderId: order_id,
      userId: currentUserId,
    });

    // Emit events
    eventBus.emit('stock.updated', {
      product_id: product_id,
      quantity: updatedStock.quantity,
      stock_version: updatedStock.stockVersion,
      movement_type: 'RETURN',
      updated_by: currentUserId,
      updated_at: updatedStock.updatedAt,
    });

    eventBus.emit('stock.movement.created', {
      movement_id: movement.movementId,
      product_id: product_id,
      movement_type: 'RETURN',
      quantity: quantity,
      order_id: order_id,
      created_by: currentUserId,
      created_at: movement.createdAt,
    });

    return {
      movement_id: movement.movementId,
      product_id: product_id,
      movement_type: StockMovementType.RETURN,
      quantity: quantity,
      order_id: order_id,
      reason: reason,
      stock: {
        stock_id: updatedStock.stockId,
        quantity: updatedStock.quantity,
        stock_version: updatedStock.stockVersion,
      },
      created_at: movement.createdAt,
    };
  }

  /**
   * Stock Out (Automatic - called by Order service)
   * Decreases stock when order is completed
   */
  static async stockOut(
    productId: number,
    quantity: number,
    price: number,
    orderId: number,
    shiftId: number,
    currentUserId: number
  ): Promise<void> {
    // Get stock record
    const stock = await prisma.stock.findUnique({
      where: { productId: productId },
    });

    if (!stock) {
      throw new ValidationException('Stock not found for product');
    }

    // Create stock movement
    await prisma.stockMovement.create({
      data: {
        productId: productId,
        movementType: 'STOCK_OUT',
        quantity: -quantity, // Negative for stock out
        price: price,
        orderId: orderId,
        shiftId: shiftId,
        createdBy: currentUserId,
        createdAt: new Date(),
      },
    });

    // Update stock quantity
    await prisma.stock.update({
      where: { productId: productId },
      data: {
        quantity: stock.quantity - quantity,
        stockVersion: stock.stockVersion + 1,
        updatedAt: new Date(),
      },
    });

    logger.info('Stock Out (automatic)', {
      productId: productId,
      quantity: quantity,
      orderId: orderId,
    });
  }

}