import { Router, type IRouter } from 'express';
import { authenticateToken } from '@src/shared/middleware/auth.middleware';
import { requireAdmin } from '@src/shared/middleware/authorization.middleware';
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

// Create category - Admin only
router.post(
  '/',
  requireAdmin,
  ...validateRequest(createCategoryValidator),
  CategoryController.createCategory
);

// Update category - Admin only
router.put(
  '/:id',
  requireAdmin,
  ...validateRequest(getCategoryValidator),
  ...validateRequest(updateCategoryValidator),
  CategoryController.updateCategory
);

// Delete category (soft delete) - Admin only
router.delete(
  '/:id',
  requireAdmin,
  ...validateRequest(getCategoryValidator),
  CategoryController.deleteCategory
);

export default router;
