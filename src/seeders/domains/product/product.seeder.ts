import { BaseSeeder } from '../../base-seeder';
import prisma from '../../../database/client';
import { productSeedData } from './product-seed-data';
import { SeederHelper } from '../utils/seeder-helper';

export class ProductSeeder extends BaseSeeder {
  name = 'Products';

  async seed(): Promise<void> {
    const adminUser = await prisma.user.findFirst({
      where: { role: 'ADMIN' },
      select: { userId: true, tenantId: true },
    });
    if (!adminUser) {
      throw new Error('No admin user found. Please seed users first.');
    }

    for (const productData of productSeedData) {
      const costMultiplier = SeederHelper.randomFloat(0.5, 0.9);
      const avgCost = parseFloat((productData.price * costMultiplier).toFixed(2));

      await prisma.product.upsert({
        where: {
          tenantId_productCode: {
            tenantId: adminUser.tenantId,
            productCode: productData.productCode,
          },
        },
        update: {
          productName: productData.productName,
          barcode: productData.barcode,
          price: productData.price,
          lastPurchaseCost: avgCost,
          category: productData.category,
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
          category: productData.category,
          description: productData.description,
          imagePath: productData.imagePath,
          lowStockThreshold: productData.lowStockThreshold,
          reorderPoint: productData.lowStockThreshold ?? 0,
          hasExpiry: productData.hasExpiry ?? false,
          status: productData.status,
          tenantId: adminUser.tenantId,
          createdBy: adminUser.userId,
          updatedBy: adminUser.userId,
        },
      });
    }

    console.log(`   Created/Updated ${productSeedData.length} products`);
  }
}
