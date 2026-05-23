import prisma from '@src/database/client';
import type { PrismaTransaction } from '@src/shared/types/database.types';
import { StockMovementType } from '@src/domains/Stock/enums/stock-movement-type.enum';
import { ProductStatus } from '@src/domains/Product/enums/product-status.enum';
import { ProductService } from '@src/domains/Product/services/product.service';
import { StockLotService } from '@src/domains/Stock/services/stock-lot.service';
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
      // Get stock for specific product (scoped to this tenant)
      const stock = await prisma.stock.findFirst({
        where: {
          productId: product_id,
        },
        include: { product: { include: { category: true } } },
      });

      // If stock doesn't exist, check if product exists
      if (!stock) {
        const product = await prisma.product.findFirst({
          where: {
            productId: product_id,
          },
        });

        if (!product || product.deactivatedDate) {
          throw new ValidationException('Product not found');
        }

        // Automatically create stock record with quantity 0 for products without stock record
        const newStock = await prisma.stock.create({
          data: {
            productId: product.productId,
            quantity: 0,
            stockVersion: 1,
          },
          include: { product: { include: { category: true } } },
        });

        await auditLogService.createAuditLog({
          userId: currentUserId,
          action: 'VIEW_STOCK',
          resource: 'Stock',
          entityId: newStock.stockId,
          details: { productId: product_id, note: 'Stock record auto-created' },
        });

        // Calculate stock status
        const quantity = newStock.quantity;
        const threshold = newStock.product.lowStockThreshold || 0;
        let stockStatus: 'in_stock' | 'low_stock' | 'out_of_stock' | 'negative';
        if (quantity < 0) {
          stockStatus = 'negative';
        } else if (quantity === 0) {
          stockStatus = 'out_of_stock';
        } else if (threshold > 0 && quantity <= threshold) {
          stockStatus = 'low_stock';
        } else {
          stockStatus = 'in_stock';
        }

        // Fetch earliest expiry date for this product
        const lots = await prisma.stockLot.findMany({
          where: {
            productId: product_id,
            qtyOnHand: { gt: 0 },
            expiredAt: { not: null },
          },
          orderBy: { expiredAt: 'asc' },
          take: 1,
        });
        const expiredAt = lots.length > 0 ? lots[0].expiredAt : null;

        // Return flattened format for single stock
        return {
          stock_id: newStock.stockId,
          product_id: newStock.productId,
          product_code: newStock.product.productCode,
          product_name: newStock.product.productName,
          has_expiry: newStock.product.hasExpiry,
          image_path: ProductService.normalizeImageUrl(newStock.product.imagePath),
          barcode: newStock.product.barcode,
          category: newStock.product.category?.name || null,
          quantity: newStock.quantity,
          low_stock_threshold: newStock.product.lowStockThreshold,
          stock_version: newStock.stockVersion,
          status: stockStatus,
          product_status: newStock.product.status as ProductStatus,
          last_sync_time: newStock.lastSyncTime,
          expired_at: expiredAt,
          updated_at: newStock.updatedAt,
        };
      }

      await auditLogService.createAuditLog({
        userId: currentUserId,
        action: 'VIEW_STOCK',
        resource: 'Stock',
        entityId: stock.stockId,
        details: { productId: product_id },
      });

      // Calculate stock status
      const quantity = stock.quantity;
      const threshold = stock.product.lowStockThreshold || 0;
      let stockStatus: 'in_stock' | 'low_stock' | 'out_of_stock' | 'negative';
      if (quantity < 0) {
        stockStatus = 'negative';
      } else if (quantity === 0) {
        stockStatus = 'out_of_stock';
      } else if (threshold > 0 && quantity <= threshold) {
        stockStatus = 'low_stock';
      } else {
        stockStatus = 'in_stock';
      }

      // Fetch earliest expiry date for this product
      const lots = await prisma.stockLot.findMany({
        where: {
          productId: product_id,
          qtyOnHand: { gt: 0 },
          expiredAt: { not: null },
        },
        orderBy: { expiredAt: 'asc' },
        take: 1,
      });
      const expiredAt = lots.length > 0 ? lots[0].expiredAt : null;

      // Return flattened format for single stock
      return {
        stock_id: stock.stockId,
        product_id: stock.productId,
        product_code: stock.product.productCode,
        product_name: stock.product.productName,
        has_expiry: stock.product.hasExpiry,
        image_path: ProductService.normalizeImageUrl(stock.product.imagePath),
        barcode: stock.product.barcode,
        category: stock.product.category?.name || null,
        quantity: stock.quantity,
        low_stock_threshold: stock.product.lowStockThreshold,
        stock_version: stock.stockVersion,
        status: stockStatus,
        product_status: stock.product.status as ProductStatus,
        last_sync_time: stock.lastSyncTime,
        expired_at: stock.product.hasExpiry ? expiredAt : null,
        updated_at: stock.updatedAt,
      };
    }

    // Get all stock levels (with pagination and filters)
    const { page = 1, limit = 50, version: stockVersion, status, category, category_id, search, barcode, product_status } = request;

    // Build where clause for stock — scoped to this tenant's products
    const stockWhere: any = {};
    if (stockVersion) {
      stockWhere.stockVersion = stockVersion;
    }

    // No tenant scoping needed as multi-tenancy is removed

    if (product_status) {
      stockWhere.product = {
        ...(stockWhere.product || {}),
        status: product_status,
      };
    }

    // Get all stocks with products (we'll compute a stable summary from this base set)
    const allStocks = await prisma.stock.findMany({
      where: stockWhere,
      include: {
        product: { include: { category: true } },
      },
    });

    // Base set for stable summary: active products only (not affected by filters)
    // const baseStocks = allStocks.filter((s) => !!s.product && !s.product.deactivatedDate);
    const baseStocks = allStocks.filter(
      (s) =>
        !!s.product &&
        !s.product.deactivatedDate &&
        (product_status ? (s.product.status === product_status) : (s.product.status === ProductStatus.ACTIVE)) &&
        (stockVersion === undefined || s.stockVersion === stockVersion)
    );


    // Filter by product conditions (category, search, active products only)
    let filteredStocks = allStocks.filter((s) => {
      if (!s.product || s.product.deactivatedDate) {
        return false;
      }

      // If product_status filter is NOT provided, only show active products by default
      if (!product_status && s.product.status !== ProductStatus.ACTIVE) {
        return false;
      }

      if (barcode && s.product.barcode !== barcode) {
        return false;
      }

      if (category_id && s.product.categoryId !== category_id) {
        return false;
      }

      if (category && s.product.category?.name !== category) {
        return false;
      }

      if (search) {
        const searchLower = search.toLowerCase();
        const matchesName = s.product.productName.toLowerCase().includes(searchLower);
        const matchesCode = s.product.productCode.toLowerCase().includes(searchLower);
        const matchesBarcode = (s.product.barcode || '').toLowerCase().includes(searchLower);
        if (!matchesName && !matchesCode && !matchesBarcode) {
          return false;
        }
      }

      return true;
    });

    const calcStatus = (
      quantity: number,
      threshold: number | null | undefined
    ): 'in_stock' | 'low_stock' | 'out_of_stock' | 'negative' => {
      const t = threshold || 0;
      if (quantity < 0) return 'negative';
      if (quantity === 0) return 'out_of_stock';
      if (t > 0 && quantity <= t) return 'low_stock';
      return 'in_stock';
    };

    // Calculate stock status for each item (filtered list)
    const stocksWithStatus = filteredStocks.map((s) => {
      const quantity = s.quantity;
      const stockStatus = calcStatus(quantity, s.product?.lowStockThreshold);

      return {
        ...s,
        stockStatus,
      };
    });

    // Apply status filter if provided
    let finalStocks = stocksWithStatus;
    if (status) {
      finalStocks = stocksWithStatus.filter((s) => s.stockStatus === status);
    }

    // Stable summary: computed from baseStocks (not affected by filters/pagination)
    const baseWithStatus = baseStocks.map((s) => ({
      ...s,
      stockStatus: calcStatus(s.quantity, s.product?.lowStockThreshold),
    }));
    const summary = {
      total_products: baseWithStatus.length,
      total_stock_quantity: baseWithStatus.reduce((sum, s) => sum + s.quantity, 0),
      low_stock_count: baseWithStatus.filter((s) => s.stockStatus === 'low_stock').length,
      out_of_stock_count: baseWithStatus.filter((s) => s.stockStatus === 'out_of_stock').length,
      negative_stock_count: baseWithStatus.filter((s) => s.stockStatus === 'negative').length,
    };

    // Apply pagination
    const total = finalStocks.length;
    const skip = (page - 1) * limit;
    const paginatedStocks = finalStocks.slice(skip, skip + limit);

    await auditLogService.createAuditLog({
      userId: currentUserId,
      action: 'LIST_STOCK',
      resource: 'Stock',
      details: { filters: { version: stockVersion, status, category, category_id, search } },
    });

    // Fetch earliest expiry dates for paginated stocks
    const productIds = paginatedStocks.map((s) => s.productId);
    const expiryDates = await prisma.stockLot.groupBy({
      by: ['productId'],
      where: {
        productId: { in: productIds },
        qtyOnHand: { gt: 0 },
        expiredAt: { not: null },
      },
      _min: {
        expiredAt: true,
      },
    });
    const expiryMap = new Map<number, Date | null>(
      expiryDates.map((d) => [d.productId, d._min.expiredAt])
    );

    // Build response object
    const response: GetStockResponse = {
      stocks: paginatedStocks.map((s) => ({
        stock_id: s.stockId,
        product_id: s.productId,
        product_code: s.product!.productCode,
        product_name: s.product!.productName,
        image_path: ProductService.normalizeImageUrl(s.product!.imagePath),
        barcode: s.product!.barcode,
        category: s.product!.category?.name || null,
        price: Number(s.product!.price),
        quantity: s.quantity,
        low_stock_threshold: s.product!.lowStockThreshold,
        stock_version: s.stockVersion,
        status: s.stockStatus,
        product_status: s.product!.status as ProductStatus,
        last_sync_time: s.lastSyncTime,
        has_expiry: s.product!.hasExpiry,
        expired_at: s.product!.hasExpiry ? (expiryMap.get(s.productId) || null) : null,
        updated_at: s.updatedAt,
      })),
      summary,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };

    // Only include version and last_sync_time when version parameter is provided (for sync)
    // if (stockVersion !== undefined) {
    //   response.version = stockVersion;
    //   response.last_sync_time =
    //   paginatedStocks.length > 0
    //     ? paginatedStocks.reduce((latest, s) =>
    //         !latest || (s.lastSyncTime && s.lastSyncTime > latest)
    //           ? s.lastSyncTime
    //           : latest,
    //         null as Date | null
    //       )
    //     : null;

    // }

    return response;
  }

  /**
   * Stock In (Admin only)
   * Adds stock and creates movement record
   */
  static async stockIn(
    request: StockInRequest,
    currentUserId: number
  ): Promise<StockInResponse> {
    const { product_id, quantity, cost, supplier, date, received_at, expired_at } = request;

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

    const receivedAt = received_at ?? date ?? new Date();
    const expiredAt = expired_at ?? null;

    if (product.hasExpiry && !expiredAt) {
      throw new ValidationException('Expiry date is required for this product');
    }

    const { updatedStock, movement, stockId, stockBefore } = await prisma.$transaction(async (tx) => {
      // Get or create stock record
      let stock = await tx.stock.findUnique({
        where: { productId: product_id },
      });

      if (!stock) {
        stock = await tx.stock.create({
          data: {
            productId: product_id,
            quantity: 0,
            stockVersion: 1,
            updatedAt: new Date(),
          },
        });
      }

      const { movement } = await StockLotService.createLotStockIn(
        {
          productId: product_id,
          quantity,
          cost,
          supplier,
          receivedAt,
          expiredAt,
          createdBy: currentUserId,
        },
        tx
      );

      const updatedStock = await tx.stock.update({
        where: { productId: product_id },
        data: {
          quantity: stock.quantity + quantity,
          stockVersion: stock.stockVersion + 1,
          updatedAt: new Date(),
        },
      });

      if (cost != null) {
        // FIFO: cost is tracked at the lot level (stock_lots.cost).
        // We only update lastPurchaseCost as a reference — no WAC calculation.
        await tx.product.update({
          where: { productId: product_id },
          data: {
            lastPurchaseCost: Number(cost),
          },
        });
      } else {
        logger.warn('Stock in without cost, lastPurchaseCost not updated', {
          productId: product_id,
          quantity,
        });
      }

      return {
        updatedStock,
        movement,
        stockId: stock.stockId,
        stockBefore: stock.quantity,
      };
    });

    await auditLogService.createAuditLog({
      userId: currentUserId,
      action: 'STOCK_IN',
      resource: 'Stock',
      entityId: stockId,
      details: {
        productId: product_id,
        quantity: quantity,
        cost: cost,
        supplier: supplier,
        stockBefore,
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
   * Stock Adjustment (Admin only)
   * Adjusts stock (can be positive or negative)
   */
  static async stockAdjust(
    request: StockAdjustRequest,
    currentUserId: number
  ): Promise<StockAdjustResponse> {
    const { product_id, quantity, reason } = request;

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
    currentUserId: number,
    tx?: PrismaTransaction,
    options?: { allowExpired?: boolean; allowNegative?: boolean; reason?: string }
  ): Promise<{ totalCost: number }> {
    const execute = async (db: PrismaTransaction) => {
      const stock = await db.stock.findUnique({
        where: { productId },
      });

      if (!stock) {
        throw new ValidationException('Stock not found for product');
      }

      const { totalCost } = await StockLotService.allocateStockOutFEFO(
        {
          productId,
          quantity,
          price,
          orderId,
          createdBy: currentUserId,
          allowExpired: options?.allowExpired,
          allowNegative: options?.allowNegative,
          reason: options?.reason,
        },
        db
      );

      await db.stock.update({
        where: { productId },
        data: {
          quantity: stock.quantity - quantity,
          stockVersion: stock.stockVersion + 1,
          updatedAt: new Date(),
        },
      });

      return { totalCost };
    };

    if (tx) {
      return execute(tx);
    } else {
      return prisma.$transaction(async (db) => execute(db));
    }

    logger.info('Stock Out (automatic)', {
      productId,
      quantity,
      orderId,
    });
  }

}
