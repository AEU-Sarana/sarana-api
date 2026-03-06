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
  GetCategoriesResponse,
  ToggleProductStatusResponse,
} from '@src/domains/Product/types/product.types';
import { ValidationException, BusinessLogicException } from '@src/shared/exceptions';
import { logger } from '@src/shared/utils/logger';
import { auditLogService } from '@src/shared/services/audit-log.service';
import { fileStorageService } from '@src/shared/services/file-storage.service';
import { env } from '@src/shared/config/env';
import { getLocalNetworkIP } from '@src/shared/utils/helpers';

export class ProductService {
  /**
   * Normalize image URL - convert old MinIO URLs to new nginx proxy format
  */
  static normalizeImageUrl(imagePath: string | null): string | null {
    if (!imagePath) return null;


    if (imagePath.startsWith('/storage/')) {

      let baseUrl = env.API_BASE_URL || env.APP_URL;
      if (!baseUrl) {
        const protocol = env.STORAGE_USE_SSL ? 'https' : 'http';
        const networkIP = getLocalNetworkIP();
        const host = process.env.API_HOST || networkIP || 'localhost';
        const port = env.NGINX_HTTP_PORT || 8080;
        baseUrl = `${protocol}://${host}:${port}`;
      }
      baseUrl = baseUrl.replace(/\/$/, '');
      return imagePath.startsWith('http') ? imagePath : `${baseUrl}${imagePath}`;
    }


    if (imagePath.includes('/storage/')) {
      try {
        const parsed = new URL(imagePath);
        const storageIndex = parsed.pathname.indexOf('/storage/');
        if (storageIndex !== -1) {
          const storagePath = parsed.pathname.substring(storageIndex);
          let baseUrl = env.API_BASE_URL || env.APP_URL;
          if (baseUrl) {
            baseUrl = baseUrl.replace(/\/$/, '');
            return `${baseUrl}${storagePath}`;
          }
        }
      } catch (err) {
        logger.warn('Failed to parse image URL for normalization', { imagePath, error: err });
      }

      return imagePath;
    }


    try {
      const url = new URL(imagePath);
      const pathParts = url.pathname.split('/').filter(Boolean);

      // Find bucket (usually first part after domain)
      if (pathParts.length >= 2) {
        const bucket = pathParts[0];
        const key = pathParts.slice(1).join('/');

        // Get base URL
        let baseUrl = env.API_BASE_URL || env.APP_URL || env.FRONTEND_URL;
        if (!baseUrl) {
          const protocol = env.STORAGE_USE_SSL ? 'https' : 'http';
          const networkIP = getLocalNetworkIP();
          const host = process.env.API_HOST || networkIP || 'localhost';
          const port = env.NGINX_HTTP_PORT || 8080;
          baseUrl = `${protocol}://${host}:${port}`;
        }
        baseUrl = baseUrl.replace(/\/$/, '');

        // Return new format URL
        return `${baseUrl}/storage/${bucket}/${key}`;
      }
    } catch (error) {
      const match = imagePath.match(/\/([^\/]+)\/(.+)$/);
      if (match) {
        const bucket = match[1];
        const key = match[2];

        let baseUrl = env.API_BASE_URL || env.APP_URL || env.FRONTEND_URL;
        if (!baseUrl) {
          const protocol = env.STORAGE_USE_SSL ? 'https' : 'http';
          const networkIP = getLocalNetworkIP();
          const host = process.env.API_HOST || networkIP || 'localhost';
          const port = env.NGINX_HTTP_PORT || 8080;
          baseUrl = `${protocol}://${host}:${port}`;
        }
        baseUrl = baseUrl.replace(/\/$/, '');

        return `${baseUrl}/storage/${bucket}/${key}`;
      }
    }

    // If we can't parse it, return as is (might be external URL)
    return imagePath;
  }
  /**
   * List products with filters
   * Supports: page, limit, status, category, search, barcode
  */
  static async listProducts(
    request: ListProductsRequest,
    currentUserId: number,
    currentTenantId?: number
  ): Promise<ListProductsResponse> {
    const { page = 1, limit = 50, status, category, search, barcode } = request;

    const where: any = {
      deactivatedDate: null,
    };

    // Scope products to the current admin's tenant via the creator's tenantId
    if (currentTenantId) {
      where.createdByUser = { tenantId: currentTenantId };
    }

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
      orderBy: [
        { status: 'asc' }, // 'active' comes before 'inactive' alphabetically
        { createdAt: 'desc' }
      ],
      include: {
        stock: true,
        stock_lots: {
          where: { qtyOnHand: { gt: 0 }, expiredAt: { not: null } },
          orderBy: { expiredAt: 'asc' },
          take: 1
        }
      },
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
        image_path: this.normalizeImageUrl(p.imagePath),
        low_stock_threshold: p.lowStockThreshold,
        has_expiry: p.hasExpiry,
        stock_quantity: p.stock?.quantity || 0,
        expired_at: p.hasExpiry ? (p.stock_lots?.[0]?.expiredAt || null) : null,
        status: (p.status as any) as ProductStatus,
        created_at: p.createdAt,
        updated_at: p.updatedAt,
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get product details by ID
   */
  static async getProduct(
    productId: number,
    currentUserId: number,
    currentTenantId?: number
  ): Promise<GetProductResponse> {
    const product = await prisma.product.findFirst({
      where: {
        productId,
        ...(currentTenantId ? { createdByUser: { tenantId: currentTenantId } } : {}),
      },
      include: {
        stock: true,
        stock_lots: {
          where: { qtyOnHand: { gt: 0 }, expiredAt: { not: null } },
          orderBy: { expiredAt: 'asc' },
          take: 1
        }
      },
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
      image_path: this.normalizeImageUrl(product.imagePath),
      low_stock_threshold: product.lowStockThreshold,
      has_expiry: product.hasExpiry,
      stock_quantity: product.stock?.quantity || 0,
      expired_at: product.hasExpiry ? (product.stock_lots?.[0]?.expiredAt || null) : null,
      status: (product.status as any) as ProductStatus,
      created_at: product.createdAt,
      updated_at: product.updatedAt,
    };
  }

  /**
   * Get product details by product code
  */
  static async getProductByCode(
    productCode: string,
    currentUserId: number,
    currentTenantId?: number
  ): Promise<GetProductResponse> {
    const product = await prisma.product.findFirst({
      where: {
        productCode,
        deactivatedDate: null,
        ...(currentTenantId ? { createdByUser: { tenantId: currentTenantId } } : {}),
      },
      include: {
        stock: true,
        stock_lots: {
          where: { qtyOnHand: { gt: 0 }, expiredAt: { not: null } },
          orderBy: { expiredAt: 'asc' },
          take: 1
        }
      },
    });

    if (!product) {
      throw new ValidationException('Product not found');
    }

    await auditLogService.createAuditLog({
      userId: currentUserId,
      action: 'VIEW_PRODUCT',
      resource: 'Product',
      entityId: product.productId,
    });

    return {
      product_id: product.productId,
      product_code: product.productCode,
      product_name: product.productName,
      barcode: product.barcode,
      price: Number(product.price),
      category: product.category,
      description: product.description,
      image_path: this.normalizeImageUrl(product.imagePath),
      low_stock_threshold: product.lowStockThreshold,
      has_expiry: product.hasExpiry,
      stock_quantity: product.stock?.quantity || 0,
      expired_at: product.hasExpiry ? (product.stock_lots?.[0]?.expiredAt || null) : null,
      status: (product.status as any) as ProductStatus,
      created_at: product.createdAt,
      updated_at: product.updatedAt,
    };
  }

  /**
   * Create product (Admin only)
   * 
   * @param request - Product creation request
   * @param currentUserId - Current user ID
   * @param imageFile - Optional uploaded image file
  */
  static async createProduct(
    request: CreateProductRequest,
    currentUserId: number,
    imageFile?: Express.Multer.File
  ): Promise<CreateProductResponse> {
    const {
      product_name,
      barcode,
      price,
      category,
      description,
      image_path,
      low_stock_threshold,
      has_expiry,
    } = request;

    // Convert string values to numbers if needed
    const priceNumber = typeof price === 'string' ? parseFloat(price) : price;
    const lowStockThresholdNumber = low_stock_threshold !== undefined && low_stock_threshold !== null
      ? (typeof low_stock_threshold === 'string' ? parseInt(low_stock_threshold, 10) : low_stock_threshold)
      : null;
    const hasExpiryBoolean =
      has_expiry !== undefined && has_expiry !== null
        ? (typeof has_expiry === 'string' ? has_expiry === 'true' : Boolean(has_expiry))
        : false;

    // Always generate product_code on the backend (ignore any client-provided value).
    // This prevents accepting client-sent date strings or other invalid values.
    if (request.product_code) {
      logger.warn('Ignoring client-provided product_code on create', {
        receivedCode: request.product_code,
        userId: currentUserId,
      });
    }

    console.log('[DEBUG] Product Create - Auto-generating code for name:', product_name);
    logger.info('Auto-generating product code', { productName: product_name });

    let slug = product_name
      .trim()
      .replace(/\s+/g, '-')
      .replace(/[^^\p{L}\p{M}\p{N}-]/gu, '') // Keep unicode letters (\p{L}), marks (\p{M}), numbers (\p{N}), and hyphens
      .toLowerCase()
      .replace(/-+/g, '-')
      .replace(/(^-|-$)/g, '');

    if (!slug) {
      slug = 'prd'; // Fallback if name is stripped empty
    }

    // Find highest existing numerical suffix for this slug
    const similarProducts = await prisma.product.findMany({
      where: {
        productCode: { startsWith: `${slug}-` },
      },
      select: { productCode: true },
    });

    let maxSuffix = 0;
    for (const p of similarProducts) {
      const suffixStr = p.productCode.substring(slug.length + 1);
      if (/^\d{3,}$/.test(suffixStr)) {
        const suffixNum = parseInt(suffixStr, 10);
        if (suffixNum > maxSuffix) {
          maxSuffix = suffixNum;
        }
      }
    }

    // Try to find a unique code starting from maxSuffix + 1
    let finalProductCode: string | undefined;
    let isUnique = false;
    let counter = maxSuffix + 1;
    let attempts = 0;

    while (!isUnique && attempts < 10) {
      const suffix = String(counter).padStart(3, '0');
      const candidate = `${slug}-${suffix}`;
      const existing = await prisma.product.findFirst({
        where: { productCode: candidate, deactivatedDate: null },
      });
      if (!existing) {
        finalProductCode = candidate;
        isUnique = true;
      }
      counter++;
      attempts++;
    }

    if (!finalProductCode) {
      // Fallback to compact timestamp-based suffix if collisions still occur
      finalProductCode = `${slug}-${Date.now().toString().slice(-6)}`;
    }

    // Debug: log the final product code we will use
    logger.debug('Final product code determined for create', { finalProductCode, userId: currentUserId });

    const existingBarcode = await prisma.product.findFirst({
      where: { barcode: barcode, deactivatedDate: null },
    });
    if (existingBarcode) throw new BusinessLogicException('Barcode already exists');


    // Handle image upload if provided
    let finalImagePath = image_path || null;
    if (imageFile) {
      try {
        const uploadResult = await fileStorageService.uploadFile(
          imageFile,
          'products',
          {
            filename: `product-${finalProductCode}`,
            public: true,
            metadata: {
              productCode: finalProductCode,
              uploadedBy: currentUserId.toString(),
            },
          }
        );
        finalImagePath = uploadResult.url;
        logger.info('Product image uploaded', {
          productCode: finalProductCode,
          imageUrl: finalImagePath
        });
      } catch (error) {
        logger.error('Failed to upload product image:', error);
        throw new BusinessLogicException('Failed to upload product image');
      }
    }

    // Create product and stock in a transaction
    const product = await prisma.$transaction(async (tx) => {
      console.log('[DEBUG] Product Create - final code being used in DB:', finalProductCode);
      const newProduct = await tx.product.create({
        data: {
          productCode: finalProductCode as string,
          productName: product_name,

          barcode: barcode,
          price: priceNumber,
          category,
          description,
          imagePath: finalImagePath,
          lowStockThreshold: lowStockThresholdNumber,
          hasExpiry: hasExpiryBoolean,
          status: 'active',
          createdBy: currentUserId,
          updatedBy: currentUserId,
        },
      });

      // Automatically create stock record with quantity 0
      const newStock = await tx.stock.create({
        data: {
          productId: newProduct.productId,
          quantity: 0,
          stockVersion: 1,
        },
      });

      logger.info('Stock created automatically for new product', {
        stockId: newStock.stockId,
        productId: newProduct.productId,
        quantity: 0,
      });


      //Return product with stock relation
      return await tx.product.findUnique({
        where: { productId: newProduct.productId },
        include: {
          stock: true,
        },
      });
    });

    if (!product) {
      throw new BusinessLogicException('Failed to create product');
    }

    await auditLogService.createAuditLog({
      userId: currentUserId,
      action: 'CREATE_PRODUCT',
      resource: 'Product',
      entityId: product.productId,
      details: {
        productCode: product.productCode,
        productName: product.productName,
        stockCreated: true,
        stockId: product.stock?.stockId,
      },
    });

    logger.info('Product and stock created', {
      productId: product.productId,
      stockId: product.stock?.stockId,
      userId: currentUserId,
    });

    logger.debug('Returning created product', {
      productId: product.productId,
      productCode: product.productCode,
      createdAt: product.createdAt,
      userId: currentUserId,
    });

    return {
      product_id: product.productId,
      product_code: product.productCode,
      product_name: product.productName,
      barcode: product.barcode,
      price: Number(product.price),
      category: product.category,
      description: product.description,
      image_path: this.normalizeImageUrl(product.imagePath),
      low_stock_threshold: product.lowStockThreshold,
      has_expiry: product.hasExpiry,
      stock_quantity: product.stock?.quantity || 0,
      expired_at: null,
      status: (product.status as any) as ProductStatus,
      created_at: product.createdAt,
      updated_at: product.updatedAt,
    };
  }

  /**
   * Update product (Admin only)
   * 
   * @param productId - Product ID to update
   * @param request - Product update request
   * @param currentUserId - Current user ID
   * @param imageFile - Optional new image file to upload
  */
  static async updateProduct(
    productId: number,
    request: UpdateProductRequest,
    currentUserId: number,
    imageFile?: Express.Multer.File,
    currentTenantId?: number
  ): Promise<UpdateProductResponse> {
    const existing = await prisma.product.findFirst({
      where: {
        productId,
        ...(currentTenantId ? { createdByUser: { tenantId: currentTenantId } } : {}),
      },
    });
    if (!existing || existing.deactivatedDate) throw new ValidationException('Product not found');

    // Always ignore client-provided product_code on update
    if (request.product_code) {
      logger.warn('Ignoring client-provided product_code on update', {
        receivedCode: request.product_code,
        productId,
        userId: currentUserId,
      });
      request.product_code = undefined;
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

    // Handle image upload/replacement
    let finalImagePath = request.image_path ?? existing.imagePath;
    let oldImageKey: string | null = null;

    if (imageFile) {
      try {
        // Extract old image key from URL if exists
        if (existing.imagePath) {
          oldImageKey = fileStorageService.extractKeyFromUrl(existing.imagePath);
        }

        // Upload new image
        const uploadResult = await fileStorageService.uploadFile(
          imageFile,
          'products',
          {
            filename: `product-${existing.productCode}`,
            public: true,
            metadata: {
              productCode: existing.productCode,
              productId: productId.toString(),
              uploadedBy: currentUserId.toString(),
            },
          }
        );
        finalImagePath = uploadResult.url;
        logger.info('Product image updated', {
          productId,
          imageUrl: finalImagePath
        });

        // Delete old image if it exists
        if (oldImageKey) {
          try {
            await fileStorageService.deleteFile(oldImageKey);
            logger.info('Old product image deleted', { productId, oldImageKey });
          } catch (deleteError) {
            logger.warn('Failed to delete old product image', {
              productId,
              oldImageKey,
              error: deleteError
            });
            // Don't throw - image deletion failure shouldn't block update
          }
        }
      } catch (error) {
        logger.error('Failed to upload product image:', error);
        throw new BusinessLogicException('Failed to upload product image');
      }
    }

    // Convert string values to numbers if needed
    const priceNumber = request.price !== undefined
      ? (typeof request.price === 'string' ? parseFloat(request.price) : request.price)
      : undefined;
    const lowStockThresholdNumber = request.low_stock_threshold !== undefined
      ? (typeof request.low_stock_threshold === 'string'
        ? parseInt(request.low_stock_threshold, 10)
        : request.low_stock_threshold)
      : undefined;
    const hasExpiryBoolean = request.has_expiry !== undefined && request.has_expiry !== null
      ? (typeof request.has_expiry === 'string' ? request.has_expiry === 'true' : Boolean(request.has_expiry))
      : undefined;

    const updated = await prisma.$transaction(async (tx) => {
      const updatedProduct = await tx.product.update({
        where: { productId },
        data: {
          productCode: undefined,
          productName: request.product_name ?? undefined,
          barcode: request.barcode ?? undefined,
          price: priceNumber,
          category: request.category ?? undefined,
          description: request.description ?? undefined,
          imagePath: finalImagePath ?? undefined,
          lowStockThreshold: lowStockThresholdNumber,
          hasExpiry: hasExpiryBoolean,
          status: request.status ? (request.status === 'active' ? 'active' : 'inactive') : undefined,
          updatedBy: currentUserId,
          updatedAt: new Date(),
        },
      });

      // If toggled from true to false, clear expiry dates in stock_lots
      if (hasExpiryBoolean === false) {
        await tx.stockLot.updateMany({
          where: { productId },
          data: { expiredAt: null },
        });
      }

      // Re-fetch with needed relations
      return await tx.product.findUnique({
        where: { productId },
        include: {
          stock: true,
          stock_lots: {
            where: { qtyOnHand: { gt: 0 }, expiredAt: { not: null } },
            orderBy: { expiredAt: 'asc' },
            take: 1
          }
        },
      });
    });

    if (!updated) throw new ValidationException('Product not found after update');

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
      image_path: this.normalizeImageUrl(updated.imagePath),
      low_stock_threshold: updated.lowStockThreshold,
      has_expiry: updated.hasExpiry,
      stock_quantity: updated.stock?.quantity || 0,
      expired_at: updated.hasExpiry ? (updated.stock_lots?.[0]?.expiredAt || null) : null,
      status: (updated.status as any) as ProductStatus,
      created_at: updated.createdAt,
      updated_at: updated.updatedAt,
    };
  }

  /**
   * Soft delete product (Admin only)
   * Also deletes associated image from storage
  */
  static async deleteProduct(productId: number, currentUserId: number, currentTenantId?: number): Promise<void> {
    const existing = await prisma.product.findFirst({
      where: {
        productId,
        ...(currentTenantId ? { createdByUser: { tenantId: currentTenantId } } : {}),
      },
    });
    if (!existing || existing.deactivatedDate) throw new ValidationException('Product not found');

    if (existing.imagePath) {
      try {
        // Extract key from URL using storage service helper
        const imageKey = fileStorageService.extractKeyFromUrl(existing.imagePath);

        if (imageKey) {
          await fileStorageService.deleteFile(imageKey);
          logger.info('Product image deleted', { productId, imageKey });
        } else {
          logger.warn('Could not extract image key from URL', {
            productId,
            imagePath: existing.imagePath
          });
        }
      } catch (error) {
        logger.warn('Failed to delete product image', {
          productId,
          imagePath: existing.imagePath,
          error
        });
        // Don't throw - image deletion failure shouldn't block product deletion
      }
    }

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

  /**
   * Toggle product status (active <-> inactive) (Admin only)
   *
   * @param productId - Product ID to update
   * @param currentUserId - Current user ID
   */
  static async toggleProductStatus(
    productId: number,
    currentUserId: number,
    currentTenantId?: number
  ): Promise<ToggleProductStatusResponse> {
    const existing = await prisma.product.findFirst({
      where: {
        productId,
        ...(currentTenantId ? { createdByUser: { tenantId: currentTenantId } } : {}),
      },
      include: { stock: true },
    });

    if (!existing || existing.deactivatedDate) {
      throw new ValidationException('Product not found');
    }

    const newStatus = existing.status === 'active' ? 'inactive' : 'active';

    const updated = await prisma.product.update({
      where: { productId },
      data: {
        status: newStatus,
        updatedBy: currentUserId,
        updatedAt: new Date(),
      },
      include: {
        stock: true,
      },
    });

    await auditLogService.createAuditLog({
      userId: currentUserId,
      action: 'TOGGLE_PRODUCT_STATUS',
      resource: 'Product',
      entityId: productId,
      details: {
        oldStatus: existing.status,
        newStatus: updated.status,
      },
    });

    logger.info(`Product status toggled to ${newStatus}`, {
      productId,
      userId: currentUserId,
    });

    return {
      product_id: updated.productId,
      status: (updated.status as any) as ProductStatus,
      created_at: updated.createdAt,
      updated_at: updated.updatedAt,
    };
  }

  /**
   * Get product categories with counts
   */
  static async getCategories(
    currentUserId: number,
    currentTenantId?: number
  ): Promise<GetCategoriesResponse> {
    // Get all products grouped by category — scoped to this admin's tenant
    const products = await prisma.product.findMany({
      where: {
        deactivatedDate: null,
        category: { not: null },
        ...(currentTenantId ? { createdByUser: { tenantId: currentTenantId } } : {}),
      },
      select: {
        category: true,
      },
    });

    // Count products by category
    const categoryMap = new Map<string, number>();

    products.forEach((product) => {
      if (product.category) {
        const count = categoryMap.get(product.category) || 0;
        categoryMap.set(product.category, count + 1);
      }
    });

    // Convert to array format
    const categories: Array<{ category: string; count: number }> = Array.from(
      categoryMap.entries()
    ).map(([category, count]) => ({
      category,
      count,
    }));

    // Sort by category name
    categories.sort((a, b) => a.category.localeCompare(b.category));

    await auditLogService.createAuditLog({
      userId: currentUserId,
      action: 'VIEW_CATEGORIES',
      resource: 'Product',
      details: { categoryCount: categories.length },
    });

    return {
      categories,
    };
  }
}
