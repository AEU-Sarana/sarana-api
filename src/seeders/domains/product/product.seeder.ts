import { BaseSeeder } from '../../base-seeder';
import prisma from '../../../database/client';
import { productSeedData } from './product-seed-data';
import { SeederHelper } from '../utils/seeder-helper';

export class ProductSeeder extends BaseSeeder {
  name = 'Products';

  async seed(): Promise<void> {
    const adminUser = await prisma.user.findFirst({
      where: { role: 'ADMIN' },
      select: { userId: true },
    });
    if (!adminUser) {
      throw new Error('No admin user found. Please seed users first.');
    }

    // 1. Seed categories first
    const categoryNames = Array.from(
      new Set(productSeedData.map((p) => p.category).filter((c): c is string => !!c))
    );
    const categoryMap = new Map<string, number>();

    for (const name of categoryNames) {
      const cat = await prisma.category.upsert({
        where: { name },
        update: {},
        create: {
          name,
          description: `${name} products`,
        },
        select: { categoryId: true },
      });
      categoryMap.set(name, cat.categoryId);
    }

    // 2. Seed products with categoryId links
    for (const productData of productSeedData) {
      const costMultiplier = SeederHelper.randomFloat(0.5, 0.9);
      const avgCost = parseFloat((productData.price * costMultiplier).toFixed(2));
      const categoryId = productData.category ? categoryMap.get(productData.category) : null;

      await prisma.product.upsert({
        where: {
          productCode: productData.productCode,
        },
        update: {
          productName: productData.productName,
          barcode: productData.barcode,
          price: productData.price,
          lastPurchaseCost: avgCost,
          categoryId,
          description: productData.description,
          imagePath: productData.imagePath,
          lowStockThreshold: productData.lowStockThreshold,
          reorderPoint: productData.lowStockThreshold ?? 0,
          hasExpiry: productData.hasExpiry ?? false,
          status: productData.status,
          updatedBy: adminUser.userId,
        },
        create: {
          productCode: productData.productCode,
          productName: productData.productName,
          barcode: productData.barcode,
          price: productData.price,
          lastPurchaseCost: avgCost,
          categoryId,
          description: productData.description,
          imagePath: productData.imagePath,
          lowStockThreshold: productData.lowStockThreshold,
          reorderPoint: productData.lowStockThreshold ?? 0,
          hasExpiry: productData.hasExpiry ?? false,
          status: productData.status,
          createdBy: adminUser.userId,
          updatedBy: adminUser.userId,
        },
      });
    }

    console.log(`   Created/Updated ${productSeedData.length} products`);
  }
}
