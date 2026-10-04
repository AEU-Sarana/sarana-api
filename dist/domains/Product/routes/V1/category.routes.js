"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_middleware_1 = require("../../../../shared/middleware/auth.middleware");
const validation_middleware_1 = require("../../../../shared/middleware/validation.middleware");
const category_controller_1 = require("../../../../domains/Product/controllers/V1/category.controller");
const index_1 = require("../../../../domains/Product/validators/V1/index");
const router = (0, express_1.Router)();
// All routes require authentication
router.use(auth_middleware_1.authenticateToken);
// List categories - All users
router.get('/', category_controller_1.CategoryController.listCategories);
// Get category details (includes products optionally) - All users
router.get('/:id', ...(0, validation_middleware_1.validateRequest)(index_1.getCategoryValidator), category_controller_1.CategoryController.getCategory);
// Create category
router.post('/', (0, auth_middleware_1.requirePermission)('catalog.categories', 'create'), ...(0, validation_middleware_1.validateRequest)(index_1.createCategoryValidator), category_controller_1.CategoryController.createCategory);
// Update category
router.put('/:id', (0, auth_middleware_1.requirePermission)('catalog.categories', 'update'), ...(0, validation_middleware_1.validateRequest)(index_1.getCategoryValidator), ...(0, validation_middleware_1.validateRequest)(index_1.updateCategoryValidator), category_controller_1.CategoryController.updateCategory);
// Delete category (soft delete)
router.delete('/:id', (0, auth_middleware_1.requirePermission)('catalog.categories', 'delete'), ...(0, validation_middleware_1.validateRequest)(index_1.getCategoryValidator), category_controller_1.CategoryController.deleteCategory);
// Toggle category status
router.patch('/:id/toggle-status', (0, auth_middleware_1.requirePermission)('catalog.categories', 'update'), ...(0, validation_middleware_1.validateRequest)(index_1.getCategoryValidator), category_controller_1.CategoryController.toggleStatus);
exports.default = router;
//# sourceMappingURL=category.routes.js.map