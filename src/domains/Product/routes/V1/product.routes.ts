import { Router, type IRouter } from 'express';
import { authenticateToken, requirePermission } from '@src/shared/middleware/auth.middleware';
import { validateRequest } from '@src/shared/middleware/validation.middleware';
import { ProductController } from '@src/domains/Product/controllers/V1/product.controller';
import {
  listProductsValidator,
  getProductValidator,
  createProductValidator,
  updateProductValidator,
  deleteProductValidator,
  toggleStatusValidator,
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

// Create product
router.post(
  '/',
  requirePermission('catalog.manage_products', 'create'),
  productImageUploadAny, // Handle single image upload with any field name
  ...validateRequest(createProductValidator),
  ProductController.createProduct
);

// Update product
router.put(
  '/:id',
  requirePermission('catalog.manage_products', 'update'),
  productImageUploadAny, // Handle single image upload with any field name
  ...validateRequest(updateProductValidator),
  ProductController.updateProduct
);

// Delete product (soft delete)
router.delete(
  '/:id',
  requirePermission('catalog.manage_products', 'delete'),
  ...validateRequest(deleteProductValidator),
  ProductController.deleteProduct
);

// Toggle product status (active <-> inactive)
router.patch(
  '/:id/toggle-status',
  requirePermission('catalog.manage_products', 'update'),
  ...validateRequest(toggleStatusValidator),
  ProductController.toggleStatus
);

export default router;