"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CategoryController = void 0;
const category_service_1 = require("../../../../domains/Product/services/category.service");
const logger_1 = require("../../../../shared/utils/logger");
const categoryService = new category_service_1.CategoryService();
class CategoryController {
    static async listCategories(req, res) {
        try {
            const includeInactive = req.query.include_inactive === 'true';
            const response = await categoryService.getAllCategories(includeInactive);
            res.status(200).json({
                success: true,
                data: response,
                message: 'Categories retrieved successfully',
            });
        }
        catch (error) {
            logger_1.logger.error('List categories error', { error: error.message });
            throw error;
        }
    }
    static async getCategory(req, res) {
        try {
            const categoryId = parseInt(req.params.id, 10);
            const includeProducts = req.query.include_products === 'true';
            const response = await categoryService.getCategoryById(categoryId, includeProducts);
            res.status(200).json({
                success: true,
                data: response,
                message: 'Category retrieved successfully',
            });
        }
        catch (error) {
            logger_1.logger.error('Get category error', { error: error.message });
            throw error;
        }
    }
    static async createCategory(req, res) {
        try {
            const response = await categoryService.createCategory(req.body);
            res.status(201).json({
                success: true,
                data: response,
                message: 'Category created successfully',
            });
        }
        catch (error) {
            logger_1.logger.error('Create category error', { error: error.message });
            throw error;
        }
    }
    static async updateCategory(req, res) {
        try {
            const categoryId = parseInt(req.params.id, 10);
            const response = await categoryService.updateCategory(categoryId, req.body);
            res.status(200).json({
                success: true,
                data: response,
                message: 'Category updated successfully',
            });
        }
        catch (error) {
            logger_1.logger.error('Update category error', { error: error.message });
            throw error;
        }
    }
    static async deleteCategory(req, res) {
        try {
            const categoryId = parseInt(req.params.id, 10);
            await categoryService.deleteCategory(categoryId);
            res.status(200).json({
                success: true,
                data: {},
                message: 'Category deleted successfully',
            });
        }
        catch (error) {
            logger_1.logger.error('Delete category error', { error: error.message });
            throw error;
        }
    }
    static async toggleStatus(req, res) {
        try {
            const categoryId = parseInt(req.params.id, 10);
            const response = await categoryService.toggleCategoryStatus(categoryId);
            res.status(200).json({
                success: true,
                data: response,
                message: 'Category status toggled successfully',
            });
        }
        catch (error) {
            logger_1.logger.error('Toggle category status error', { error: error.message });
            throw error;
        }
    }
}
exports.CategoryController = CategoryController;
//# sourceMappingURL=category.controller.js.map