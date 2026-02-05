import { BaseSeeder } from '../../base-seeder';
import prisma from '../../../database/client';
import { productSeedData } from './product-seed-data';
import { SeederHelper } from '../utils/seeder-helper';

export class ProductSeeder extends BaseSeeder {
  name = 'Products';

  async seed(): Promise<void> {
    const adminUserId = await SeederHelper.getAdminUserId();

    for (const productData of productSeedData) {
      const costMultiplier = SeederHelper.randomFloat(0.5, 0.9);
      const avgCost = parseFloat((productData.price * costMultiplier).toFixed(2));

      await prisma.product.upsert({
        where: { productCode: productData.productCode },
        update: {
          productName: productData.productName,
          barcode: productData.barcode,
          price: productData.price,
          avgCost: avgCost,
          lastPurchaseCost: avgCost,
          category: productData.category,
          description: productData.description,
          imagePath: productData.imagePath,
          lowStockThreshold: productData.lowStockThreshold,
          reorderPoint: productData.lowStockThreshold ?? 0,
          hasExpiry: productData.hasExpiry ?? false,
          status: productData.status,
          updatedBy: adminUserId,
        },
        create: {
          productCode: productData.productCode,
          productName: productData.productName,
          barcode: productData.barcode,
          price: productData.price,
          avgCost: avgCost,
          lastPurchaseCost: avgCost,
          category: productData.category,
          description: productData.description,
          imagePath: productData.imagePath,
          lowStockThreshold: productData.lowStockThreshold,
          reorderPoint: productData.lowStockThreshold ?? 0,
          hasExpiry: productData.hasExpiry ?? false,
          status: productData.status,
          createdBy: adminUserId,
          updatedBy: adminUserId,
        },
      });
    }

    console.log(`   Created/Updated ${productSeedData.length} products`);
  }
}
