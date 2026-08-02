import { Router, type IRouter } from 'express';
import { authenticateToken, requirePermission } from '@src/shared/middleware/auth.middleware';
import { validateRequest } from '@src/shared/middleware/validation.middleware';
import { CategoryController } from '@src/domains/Product/controllers/V1/category.controller';
import {
  createCategoryValidator,
  updateCategoryValidator,
  getCategoryValidator,
} from '@src/domains/Product/validators/V1/index';

const router: IRouter = Router();

// All routes require authentication
router.use(authenticateToken);

// List categories - All users
router.get(
  '/',
  CategoryController.listCategories
);

// Get category details (includes products optionally) - All users
router.get(
  '/:id',
  ...validateRequest(getCategoryValidator),
  CategoryController.getCategory
);

// Create category
router.post(
  '/',
  requirePermission('catalog.categories', 'create'),
  ...validateRequest(createCategoryValidator),
  CategoryController.createCategory
);

// Update category
router.put(
  '/:id',
  requirePermission('catalog.categories', 'update'),
  ...validateRequest(getCategoryValidator),
  ...validateRequest(updateCategoryValidator),
  CategoryController.updateCategory
);

// Delete category (soft delete)
router.delete(
  '/:id',
  requirePermission('catalog.categories', 'delete'),
  ...validateRequest(getCategoryValidator),
  CategoryController.deleteCategory
);

// Toggle category status
router.patch(
  '/:id/toggle-status',
  requirePermission('catalog.categories', 'update'),
  ...validateRequest(getCategoryValidator),
  CategoryController.toggleStatus
);

export default router;
