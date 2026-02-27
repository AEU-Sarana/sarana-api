import { Request, Response } from 'express';
import { ProductService } from '@src/domains/Product/services/product.service';
import { UserPayload } from '@src/shared/middleware/auth.middleware';
import { logger } from '@src/shared/utils/logger';

export class ProductController {
  static async listProducts(req: Request, res: Response): Promise<void> {
    try {
      const user = req.user as UserPayload;
      const request = {
        page: req.query.page ? parseInt(req.query.page as string, 10) : 1,
        limit: req.query.limit ? parseInt(req.query.limit as string, 10) : 50,
        status: req.query.status as string,
        category: req.query.category as string,
        search: req.query.search as string,
        barcode: req.query.barcode as string,
      };

      const response = await ProductService.listProducts(request, user.userId);

      res.status(200).json({
        success: true,
        data: response,
        message: 'Products retrieved successfully',
      });
    } catch (error: any) {
      logger.error('List products error', { error: error.message });
      throw error;
    }
  }

  static async getCategories(req: Request, res: Response): Promise<void> {
    try {
      const user = req.user as UserPayload;
      const response = await ProductService.getCategories(user.userId);

      res.status(200).json({
        success: true,
        data: response,
        message: 'Categories retrieved',
      });
    } catch (error: any) {
      logger.error('Get categories error', { error: error.message });
      throw error;
    }
  }

  static async getProduct(req: Request, res: Response): Promise<void> {
    try {
      const user = req.user as UserPayload;
      const idParam = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const productId = parseInt(idParam, 10);

      const response = await ProductService.getProduct(productId, user.userId);

      res.status(200).json({
        success: true,
        data: response,
        message: 'Product retrieved successfully',
      });
    } catch (error: any) {
      logger.error('Get product error', { error: error.message });
      throw error;
    }
  }

  static async createProduct(req: Request, res: Response): Promise<void> {
    try {
      const user = req.user as UserPayload;
      const imageFile = req.file;
      const response = await ProductService.createProduct(req.body, user.userId, imageFile);

      res.status(201).json({
        success: true,
        data: response,
        message: 'Product created successfully',
      });
    } catch (error: any) {
      logger.error('Create product error', { error: error.message });
      throw error;
    }
  }

  static async updateProduct(req: Request, res: Response): Promise<void> {
    try {
      const user = req.user as UserPayload;
      const idParam = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const productId = parseInt(idParam, 10);
      const imageFile = req.file;
      const response = await ProductService.updateProduct(productId, req.body, user.userId, imageFile);

      res.status(200).json({
        success: true,
        data: response,
        message: 'Product updated successfully',
      });
    } catch (error: any) {
      logger.error('Update product error', { error: error.message });
      throw error;
    }
  }

  static async deleteProduct(req: Request, res: Response): Promise<void> {
    try {
      const user = req.user as UserPayload;
      const idParam = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const productId = parseInt(idParam, 10);
      await ProductService.deleteProduct(productId, user.userId);

      res.status(200).json({
        success: true,
        data: {},
        message: 'Product deleted successfully',
      });
    } catch (error: any) {
      logger.error('Delete product error', { error: error.message });
      throw error;
    }
  }

  static async toggleStatus(req: Request, res: Response): Promise<void> {
    try {
      const user = req.user as UserPayload;
      const idParam = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const productId = parseInt(idParam, 10);

      const response = await ProductService.toggleProductStatus(productId, user.userId);

      res.status(200).json({
        success: true,
        data: response,
        message: 'Product status toggled successfully',
      });
    } catch (error: any) {
      logger.error('Toggle product status error', { error: error.message });
      throw error;
    }
  }
}