"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CategoryService = void 0;
const client_1 = __importDefault(require("../../../database/client"));
const exceptions_1 = require("../../../shared/exceptions");
class CategoryService {
    /**
     * Get all active (or all if includeInactive is true) categories
     */
    async getAllCategories(includeInactive = false) {
        return client_1.default.category.findMany({
            where: includeInactive ? undefined : { isActive: true },
            orderBy: { name: 'asc' },
        });
    }
    /**
     * Get a category by its ID
     */
    async getCategoryById(categoryId, includeProducts = false) {
        const category = await client_1.default.category.findFirst({
            where: { categoryId },
            include: includeProducts
                ? {
                    products: {
                        where: { status: 'active' },
                        orderBy: { productName: 'asc' },
                    },
                }
                : undefined,
        });
        if (!category) {
            throw new exceptions_1.ValidationException('Category not found', [], 'CATEGORY_NOT_FOUND', 404);
        }
        return category;
    }
    /**
     * Toggle category status (active <-> inactive) (Admin only)
     */
    async toggleCategoryStatus(categoryId) {
        const category = await client_1.default.category.findUnique({
            where: { categoryId },
        });
        if (!category) {
            throw new exceptions_1.ValidationException('Category not found', [], 'CATEGORY_NOT_FOUND', 404);
        }
        const newStatus = !category.isActive;
        // If deactivating, check if it contains active products
        if (!newStatus) {
            const productsCount = await client_1.default.product.count({
                where: { categoryId, status: 'active' },
            });
            if (productsCount > 0) {
                throw new exceptions_1.ValidationException('Cannot deactivate category because it contains active products', [], 'CATEGORY_CONTAINS_PRODUCTS', 400);
            }
        }
        return client_1.default.category.update({
            where: { categoryId },
            data: {
                isActive: newStatus,
                updatedAt: new Date(),
            },
        });
    }
    /**
     * Create a new category (Admin only)
     */
    async createCategory(data) {
        // Check duplicate name
        const existing = await client_1.default.category.findFirst({
            where: {
                name: { equals: data.name, mode: 'insensitive' },
            },
        });
        if (existing) {
            if (existing.isActive) {
                throw new exceptions_1.ValidationException('Category with this name already exists', [], 'DUPLICATE_CATEGORY', 400);
            }
            // If previously soft-deleted, reactivate it
            return client_1.default.category.update({
                where: { categoryId: existing.categoryId },
                data: {
                    isActive: true,
                    description: data.description ?? existing.description,
                    updatedAt: new Date(),
                },
            });
        }
        return client_1.default.category.create({
            data: {
                name: data.name,
                description: data.description,
            },
        });
    }
    /**
     * Update an existing category (Admin only)
     */
    async updateCategory(categoryId, data) {
        // Check if category exists
        await this.getCategoryById(categoryId);
        if (data.name) {
            const duplicate = await client_1.default.category.findFirst({
                where: {
                    name: { equals: data.name, mode: 'insensitive' },
                    categoryId: { not: categoryId },
                },
            });
            if (duplicate) {
                throw new exceptions_1.ValidationException('Another category with this name already exists', [], 'DUPLICATE_CATEGORY', 400);
            }
        }
        return client_1.default.category.update({
            where: { categoryId },
            data: {
                ...data,
                updatedAt: new Date(),
            },
        });
    }
    /**
     * Delete a category (soft delete)
     */
    async deleteCategory(categoryId) {
        const category = await this.getCategoryById(categoryId);
        // Check if category contains active products
        const productsCount = await client_1.default.product.count({
            where: { categoryId, status: 'active' },
        });
        if (productsCount > 0) {
            throw new exceptions_1.ValidationException('Cannot delete category because it contains active products', [], 'CATEGORY_CONTAINS_PRODUCTS', 400);
        }
        return client_1.default.category.update({
            where: { categoryId },
            data: {
                isActive: false,
                updatedAt: new Date(),
            },
        });
    }
}
exports.CategoryService = CategoryService;
//# sourceMappingURL=category.service.js.map