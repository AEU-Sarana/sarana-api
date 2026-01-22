import prisma from '@src/database/client';
import { ProductStatus } from '@src/domains/Product/enums/product-status.enum';
import {
  ListProductsRequest,
  ListProductsResponse,
  GetProductResponse,
  CreateProductRequest,
  CreateProductResponse,
  UpdateProductRequest,
  UpdateProductResponse,
} from '@src/domains/Product/types/product.types';
import { ValidationException, BusinessLogicException } from '@src/shared/exceptions';
import { logger } from '@src/shared/utils/logger';
import { auditLogService } from '@src/shared/services/audit-log.service';

export class ProductService {
  /**
   * List products with filters
   * Supports: page, limit, status, category, search, barcode
   */
  static async listProducts(
    request: ListProductsRequest,
    currentUserId: number
  ): Promise<ListProductsResponse> {
    const { page = 1, limit = 50, status, category, search, barcode } = request;

    const where: any = {
      deactivatedDate: null,
    };

    if (status) where.status = status;
    if (category) where.category = category;
    if (barcode) where.barcode = barcode;

    if (search) {
      where.OR = [
        { productName: { contains: search, mode: 'insensitive' } },
        { productCode: { contains: search, mode: 'insensitive' } },
        { barcode: { contains: search, mode: 'insensitive' } },
      ];
    }

    const total = await prisma.product.count({ where });
    const skip = (page - 1) * limit;

    const products = await prisma.product.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
    });

    await auditLogService.createAuditLog({
      userId: currentUserId,
      action: 'LIST_PRODUCTS',
      resource: 'Product',
      details: { filters: { status, category, search, barcode } },
    });

    return {
      products: products.map((p) => ({
        product_id: p.productId,
        product_code: p.productCode,
        product_name: p.productName,
        barcode: p.barcode,
        price: Number(p.price),
        category: p.category,
        description: p.description,
        image_path: p.imagePath,
        low_stock_threshold: p.lowStockThreshold,
        status: (p.status as any) as ProductStatus,
        created_at: p.createdAt,
        updated_at: p.updatedAt,
      })),
      pagination: {
        page,
        limit,
        total,
        total_pages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get product details by ID
   */
  static async getProduct(
    productId: number,
    currentUserId: number
  ): Promise<GetProductResponse> {
    const product = await prisma.product.findUnique({
      where: { productId },
    });

    if (!product || product.deactivatedDate) {
      throw new ValidationException('Product not found');
    }

    await auditLogService.createAuditLog({
      userId: currentUserId,
      action: 'VIEW_PRODUCT',
      resource: 'Product',
      entityId: productId,
    });

    return {
      product_id: product.productId,
      product_code: product.productCode,
      product_name: product.productName,
      barcode: product.barcode,
      price: Number(product.price),
      category: product.category,
      description: product.description,
      image_path: product.imagePath,
      low_stock_threshold: product.lowStockThreshold,
      status: (product.status as any) as ProductStatus,
      created_at: product.createdAt,
      updated_at: product.updatedAt,
    };
  }

  /**
   * Create product (Admin only)
   */
  static async createProduct(
    request: CreateProductRequest,
    currentUserId: number
  ): Promise<CreateProductResponse> {
    const {
      product_code,
      product_name,
      barcode,
      price,
      category,
      description,
      image_path,
      low_stock_threshold,
    } = request;

    // Uniqueness checks
    const existingCode = await prisma.product.findFirst({
      where: { productCode: product_code, deactivatedDate: null },
    });
    if (existingCode) throw new BusinessLogicException('Product code already exists');

    const existingBarcode = await prisma.product.findFirst({
      where: { barcode: barcode, deactivatedDate: null },
    });
    if (existingBarcode) throw new BusinessLogicException('Barcode already exists');

    const product = await prisma.product.create({
      data: {
        productCode: product_code,
        productName: product_name,
        barcode: barcode,
        price,
        category,
        description,
        imagePath: image_path,
        lowStockThreshold: low_stock_threshold,
        status: 'active',
        createdBy: currentUserId,
        updatedBy: currentUserId,
      },
    });

    await auditLogService.createAuditLog({
      userId: currentUserId,
      action: 'CREATE_PRODUCT',
      resource: 'Product',
      entityId: product.productId,
      details: { productCode: product.productCode, productName: product.productName },
    });

    logger.info('Product created', { productId: product.productId, userId: currentUserId });

    return {
      product_id: product.productId,
      product_code: product.productCode,
      product_name: product.productName,
      barcode: product.barcode,
      price: Number(product.price),
      category: product.category,
      description: product.description,
      image_path: product.imagePath,
      low_stock_threshold: product.lowStockThreshold,
      status: (product.status as any) as ProductStatus,
      created_at: product.createdAt,
      updated_at: product.updatedAt,
    };
  }

  /**
   * Update product (Admin only)
   */
  static async updateProduct(
    productId: number,
    request: UpdateProductRequest,
    currentUserId: number
  ): Promise<UpdateProductResponse> {
    const existing = await prisma.product.findUnique({ where: { productId } });
    if (!existing || existing.deactivatedDate) throw new ValidationException('Product not found');

    // Uniqueness checks (only if changed)
    if (request.product_code && request.product_code !== existing.productCode) {
      const codeUsed = await prisma.product.findFirst({
        where: {
          productCode: request.product_code,
          productId: { not: productId },
          deactivatedDate: null,
        },
      });
      if (codeUsed) throw new BusinessLogicException('Product code already exists');
    }

    if (request.barcode && request.barcode !== existing.barcode) {
      const barcodeUsed = await prisma.product.findFirst({
        where: {
          barcode: request.barcode,
          productId: { not: productId },
          deactivatedDate: null,
        },
      });
      if (barcodeUsed) throw new BusinessLogicException('Barcode already exists');
    }

    const updated = await prisma.product.update({
      where: { productId },
      data: {
        productCode: request.product_code ?? undefined,
        productName: request.product_name ?? undefined,
        barcode: request.barcode ?? undefined,
        price: request.price ?? undefined,
        category: request.category ?? undefined,
        description: request.description ?? undefined,
        imagePath: request.image__path ?? undefined,
        lowStockThreshold: request.low_stock_threshold ?? undefined,
        status: request.status ? (request.status === 'active' ? 'active' : 'inactive') : undefined,
        updatedBy: currentUserId,
        updatedAt: new Date(),
      },
    });

    await auditLogService.createAuditLog({
      userId: currentUserId,
      action: 'UPDATE_PRODUCT',
      resource: 'Product',
      entityId: productId,
      details: { changes: request },
    });

    logger.info('Product updated', { productId, userId: currentUserId });

    return {
      product_id: updated.productId,
      product_code: updated.productCode,
      product_name: updated.productName,
      barcode: updated.barcode,
      price: Number(updated.price),
      category: updated.category,
      description: updated.description,
      image_path: updated.imagePath,
      low_stock_threshold: updated.lowStockThreshold,
      status: (updated.status as any) as ProductStatus,
      created_at: updated.createdAt,
      updated_at: updated.updatedAt,
    };
  }

  /**
   * Soft delete product (Admin only)
   */
  static async deleteProduct(productId: number, currentUserId: number): Promise<void> {
    const existing = await prisma.product.findUnique({ where: { productId } });
    if (!existing || existing.deactivatedDate) throw new ValidationException('Product not found');

    // Optional rule: prevent deletion if used in orders (if table exists)
    // const usedCount = await prisma.orderItem.count({ where: { productId } });
    // if (usedCount > 0) throw new BusinessLogicException('Cannot delete product with order history');

    await prisma.product.update({
      where: { productId },
      data: {
        status: 'inactive',
        deactivatedDate: new Date(),
        updatedBy: currentUserId,
        updatedAt: new Date(),
      },
    });

    await auditLogService.createAuditLog({
      userId: currentUserId,
      action: 'DELETE_PRODUCT',
      resource: 'Product',
      entityId: productId,
      details: { productCode: existing.productCode },
    });

    logger.info('Product deleted (soft)', { productId, userId: currentUserId });
  }
}