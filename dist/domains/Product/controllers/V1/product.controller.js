"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProductController = void 0;
const product_service_1 = require("../../../../domains/Product/services/product.service");
const logger_1 = require("../../../../shared/utils/logger");
class ProductController {
    static async listProducts(req, res) {
        try {
            const user = req.user;
            const request = {
                page: req.query.page ? parseInt(req.query.page, 10) : 1,
                limit: req.query.limit ? parseInt(req.query.limit, 10) : 50,
                status: req.query.status,
                category: req.query.category,
                category_id: req.query.category_id ? parseInt(req.query.category_id, 10) : undefined,
                search: req.query.search,
                barcode: req.query.barcode,
            };
            const response = await product_service_1.ProductService.listProducts(request, user.userId);
            res.status(200).json({
                success: true,
                data: response,
                message: 'Products retrieved successfully',
            });
        }
        catch (error) {
            logger_1.logger.error('List products error', { error: error.message });
            throw error;
        }
    }
    static async getCategories(req, res) {
        try {
            const user = req.user;
            const response = await product_service_1.ProductService.getCategories(user.userId);
            res.status(200).json({
                success: true,
                data: response,
                message: 'Categories retrieved',
            });
        }
        catch (error) {
            logger_1.logger.error('Get categories error', { error: error.message });
            throw error;
        }
    }
    static async getProduct(req, res) {
        try {
            const user = req.user;
            const idParam = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
            const productId = parseInt(idParam, 10);
            const response = await product_service_1.ProductService.getProduct(productId, user.userId);
            res.status(200).json({
                success: true,
                data: response,
                message: 'Product retrieved successfully',
            });
        }
        catch (error) {
            logger_1.logger.error('Get product error', { error: error.message });
            throw error;
        }
    }
    static async createProduct(req, res) {
        try {
            const user = req.user;
            const imageFile = req.file;
            const response = await product_service_1.ProductService.createProduct(req.body, user.userId, imageFile);
            res.status(201).json({
                success: true,
                data: response,
                message: 'Product created successfully',
            });
        }
        catch (error) {
            logger_1.logger.error('Create product error', { error: error.message });
            throw error;
        }
    }
    static async updateProduct(req, res) {
        try {
            const user = req.user;
            const idParam = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
            const productId = parseInt(idParam, 10);
            const imageFile = req.file;
            const response = await product_service_1.ProductService.updateProduct(productId, req.body, user.userId, imageFile);
            res.status(200).json({
                success: true,
                data: response,
                message: 'Product updated successfully',
            });
        }
        catch (error) {
            logger_1.logger.error('Update product error', { error: error.message });
            throw error;
        }
    }
    static async deleteProduct(req, res) {
        try {
            const user = req.user;
            const idParam = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
            const productId = parseInt(idParam, 10);
            await product_service_1.ProductService.deleteProduct(productId, user.userId);
            res.status(200).json({
                success: true,
                data: {},
                message: 'Product deleted successfully',
            });
        }
        catch (error) {
            logger_1.logger.error('Delete product error', { error: error.message });
            throw error;
        }
    }
    static async toggleStatus(req, res) {
        try {
            const user = req.user;
            const idParam = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
            const productId = parseInt(idParam, 10);
            const response = await product_service_1.ProductService.toggleProductStatus(productId, user.userId);
            res.status(200).json({
                success: true,
                data: response,
                message: 'Product status toggled successfully',
            });
        }
        catch (error) {
            logger_1.logger.error('Toggle product status error', { error: error.message });
            throw error;
        }
    }
}
exports.ProductController = ProductController;
//# sourceMappingURL=product.controller.js.map