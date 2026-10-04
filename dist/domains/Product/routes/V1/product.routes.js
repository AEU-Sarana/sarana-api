"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_middleware_1 = require("../../../../shared/middleware/auth.middleware");
const validation_middleware_1 = require("../../../../shared/middleware/validation.middleware");
const product_controller_1 = require("../../../../domains/Product/controllers/V1/product.controller");
const index_1 = require("../../../../domains/Product/validators/V1/index");
const multer_config_1 = require("../../../../shared/utils/multer.config");
const router = (0, express_1.Router)();
// All routes require authentication
router.use(auth_middleware_1.authenticateToken);
// List products - All users
router.get('/', ...(0, validation_middleware_1.validateRequest)(index_1.listProductsValidator), product_controller_1.ProductController.listProducts);
// Get product categories - All users (MUST be before /:id route)
router.get('/categories', product_controller_1.ProductController.getCategories);
// Get product details - All users
router.get('/:id', ...(0, validation_middleware_1.validateRequest)(index_1.getProductValidator), product_controller_1.ProductController.getProduct);
// Create product
router.post('/', (0, auth_middleware_1.requirePermission)('catalog.manage_products', 'create'), multer_config_1.productImageUploadAny, // Handle single image upload with any field name
...(0, validation_middleware_1.validateRequest)(index_1.createProductValidator), product_controller_1.ProductController.createProduct);
// Update product
router.put('/:id', (0, auth_middleware_1.requirePermission)('catalog.manage_products', 'update'), multer_config_1.productImageUploadAny, // Handle single image upload with any field name
...(0, validation_middleware_1.validateRequest)(index_1.updateProductValidator), product_controller_1.ProductController.updateProduct);
// Delete product (soft delete)
router.delete('/:id', (0, auth_middleware_1.requirePermission)('catalog.manage_products', 'delete'), ...(0, validation_middleware_1.validateRequest)(index_1.deleteProductValidator), product_controller_1.ProductController.deleteProduct);
// Toggle product status (active <-> inactive)
router.patch('/:id/toggle-status', (0, auth_middleware_1.requirePermission)('catalog.manage_products', 'update'), ...(0, validation_middleware_1.validateRequest)(index_1.toggleStatusValidator), product_controller_1.ProductController.toggleStatus);
exports.default = router;
//# sourceMappingURL=product.routes.js.map