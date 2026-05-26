import { Request, Response } from 'express';
import { CategoryService } from '@src/domains/Product/services/category.service';
import { logger } from '@src/shared/utils/logger';

const categoryService = new CategoryService();

export class CategoryController {
  static async listCategories(req: Request, res: Response): Promise<void> {
    try {
      const includeInactive = req.query.include_inactive === 'true';
      const response = await categoryService.getAllCategories(includeInactive);

      res.status(200).json({
        success: true,
        data: response,
        message: 'Categories retrieved successfully',
      });
    } catch (error: any) {
      logger.error('List categories error', { error: error.message });
      throw error;
    }
  }

  static async getCategory(req: Request, res: Response): Promise<void> {
    try {
      const categoryId = parseInt(req.params.id as string, 10);
      const includeProducts = req.query.include_products === 'true';

      const response = await categoryService.getCategoryById(categoryId, includeProducts);

      res.status(200).json({
        success: true,
        data: response,
        message: 'Category retrieved successfully',
      });
    } catch (error: any) {
      logger.error('Get category error', { error: error.message });
      throw error;
    }
  }

  static async createCategory(req: Request, res: Response): Promise<void> {
    try {
      const response = await categoryService.createCategory(req.body);

      res.status(201).json({
        success: true,
        data: response,
        message: 'Category created successfully',
      });
    } catch (error: any) {
      logger.error('Create category error', { error: error.message });
      throw error;
    }
  }

  static async updateCategory(req: Request, res: Response): Promise<void> {
    try {
      const categoryId = parseInt(req.params.id as string, 10);
      const response = await categoryService.updateCategory(categoryId, req.body);

      res.status(200).json({
        success: true,
        data: response,
        message: 'Category updated successfully',
      });
    } catch (error: any) {
      logger.error('Update category error', { error: error.message });
      throw error;
    }
  }

  static async deleteCategory(req: Request, res: Response): Promise<void> {
    try {
      const categoryId = parseInt(req.params.id as string, 10);
      await categoryService.deleteCategory(categoryId);

      res.status(200).json({
        success: true,
        data: {},
        message: 'Category deleted successfully',
      });
    } catch (error: any) {
      logger.error('Delete category error', { error: error.message });
      throw error;
    }
  }

  static async toggleStatus(req: Request, res: Response): Promise<void> {
    try {
      const categoryId = parseInt(req.params.id as string, 10);
      const response = await categoryService.toggleCategoryStatus(categoryId);

      res.status(200).json({
        success: true,
        data: response,
        message: 'Category status toggled successfully',
      });
    } catch (error: any) {
      logger.error('Toggle category status error', { error: error.message });
      throw error;
    }
  }
}
