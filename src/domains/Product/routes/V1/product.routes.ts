import { Router, type IRouter } from 'express';
import { authenticateToken } from '@src/shared/middleware/auth.middleware';
import { requireAdmin, requirePermission } from '@src/shared/middleware/authorization.middleware';
import { validateRequest } from '@src/shared/middleware/validation.middleware';
import { Permission } from '@src/shared/config/permissions';
import { ProductController } from '@src/domains/Product/controllers/V1/product.controller';
import {
  listProductsValidator,
  getProductValidator,
  createProductValidator,
  updateProductValidator,
  deleteProductValidator,
} from '@src/domains/Product/validators/V1/index';
import { productImageUploadAny } from '@src/shared/utils/multer.config';

const router: IRouter = Router();

// All routes require authentication
router.use(authenticateToken);

// List products - All users
router.get(
  '/',
  ...validateRequest(listProductsValidator),
  ProductController.listProducts
);

// Get product categories - All users (MUST be before /:id route)
router.get(
  '/categories',
  ProductController.getCategories
);

// Get product details - All users
router.get(
  '/:id',
  ...validateRequest(getProductValidator),
  ProductController.getProduct
);

// Create product - Admin only
router.post(
  '/',
  requireAdmin,
  requirePermission(Permission.PRODUCT_CREATE),
  productImageUploadAny, // Handle single image upload with any field name
  ...validateRequest(createProductValidator),
  ProductController.createProduct
);

// Update product - Admin only
router.put(
  '/:id',
  requireAdmin,
  requirePermission(Permission.PRODUCT_UPDATE),
  productImageUploadAny, // Handle single image upload with any field name
  ...validateRequest(updateProductValidator),
  ProductController.updateProduct
);

// Delete product (soft delete) - Admin only
router.delete(
  '/:id',
  requireAdmin,
  requirePermission(Permission.PRODUCT_DELETE),
  ...validateRequest(deleteProductValidator),
  ProductController.deleteProduct
);

export default router;