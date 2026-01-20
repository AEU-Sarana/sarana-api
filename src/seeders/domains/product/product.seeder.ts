import { BaseSeeder } from '../../base-seeder';
import prisma from '../../../database/client';
import { productSeedData } from './product-seed-data';
import { SeederHelper } from '../utils/seeder-helper';

export class ProductSeeder extends BaseSeeder {
  name = 'Products';

  async seed(): Promise<void> {
    const adminUserId = await SeederHelper.getAdminUserId();

    for (const productData of productSeedData) {
      await prisma.product.upsert({
        where: { productCode: productData.productCode },
        update: {
          productName: productData.productName,
          qrCode: productData.qrCode,
          price: productData.price,
          category: productData.category,
          description: productData.description,
          imagePath: productData.imagePath,
          lowStockThreshold: productData.lowStockThreshold,
          status: productData.status,
          updatedBy: adminUserId,
        },
        create: {
          productCode: productData.productCode,
          productName: productData.productName,
          qrCode: productData.qrCode,
          price: productData.price,
          category: productData.category,
          description: productData.description,
          imagePath: productData.imagePath,
          lowStockThreshold: productData.lowStockThreshold,
          status: productData.status,
          createdBy: adminUserId,
          updatedBy: adminUserId,
        },
      });
    }

    console.log(`   Created/Updated ${productSeedData.length} products`);
  }
}

