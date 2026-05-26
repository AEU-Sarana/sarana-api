import prisma from '@src/database/client';
import { ValidationException } from '@src/shared/exceptions';
import { logger } from '@src/shared/utils/logger';

export class CategoryService {
  /**
   * Get all active (or all if includeInactive is true) categories
   */
  async getAllCategories(includeInactive = false) {
    return prisma.category.findMany({
      where: includeInactive ? undefined : { isActive: true },
      orderBy: { name: 'asc' },
    });
  }

  /**
   * Get a category by its ID
   */
  async getCategoryById(categoryId: number, includeProducts = false) {
    const category = await prisma.category.findFirst({
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
      throw new ValidationException('Category not found', [], 'CATEGORY_NOT_FOUND', 404);
    }

    return category;
  }

  /**
   * Toggle category status (active <-> inactive) (Admin only)
   */
  async toggleCategoryStatus(categoryId: number) {
    const category = await prisma.category.findUnique({
      where: { categoryId },
    });

    if (!category) {
      throw new ValidationException('Category not found', [], 'CATEGORY_NOT_FOUND', 404);
    }

    const newStatus = !category.isActive;

    // If deactivating, check if it contains active products
    if (!newStatus) {
      const productsCount = await prisma.product.count({
        where: { categoryId, status: 'active' },
      });

      if (productsCount > 0) {
        throw new ValidationException(
          'Cannot deactivate category because it contains active products',
          [],
          'CATEGORY_CONTAINS_PRODUCTS',
          400
        );
      }
    }

    return prisma.category.update({
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
  async createCategory(data: { name: string; description?: string }) {
    // Check duplicate name
    const existing = await prisma.category.findFirst({
      where: {
        name: { equals: data.name, mode: 'insensitive' },
      },
    });

    if (existing) {
      if (existing.isActive) {
        throw new ValidationException(
          'Category with this name already exists',
          [],
          'DUPLICATE_CATEGORY',
          400
        );
      }
      
      // If previously soft-deleted, reactivate it
      return prisma.category.update({
        where: { categoryId: existing.categoryId },
        data: {
          isActive: true,
          description: data.description ?? existing.description,
          updatedAt: new Date(),
        },
      });
    }

    return prisma.category.create({
      data: {
        name: data.name,
        description: data.description,
      },
    });
  }

  /**
   * Update an existing category (Admin only)
   */
  async updateCategory(categoryId: number, data: { name?: string; description?: string }) {
    // Check if category exists
    await this.getCategoryById(categoryId);

    if (data.name) {
      const duplicate = await prisma.category.findFirst({
        where: {
          name: { equals: data.name, mode: 'insensitive' },
          categoryId: { not: categoryId },
        },
      });

      if (duplicate) {
        throw new ValidationException(
          'Another category with this name already exists',
          [],
          'DUPLICATE_CATEGORY',
          400
        );
      }
    }

    return prisma.category.update({
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
  async deleteCategory(categoryId: number) {
    const category = await this.getCategoryById(categoryId);

    // Check if category contains active products
    const productsCount = await prisma.product.count({
      where: { categoryId, status: 'active' },
    });

    if (productsCount > 0) {
      throw new ValidationException(
        'Cannot delete category because it contains active products',
        [],
        'CATEGORY_CONTAINS_PRODUCTS',
        400
      );
    }

    return prisma.category.update({
      where: { categoryId },
      data: {
        isActive: false,
        updatedAt: new Date(),
      },
    });
  }
}
