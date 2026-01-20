import { BaseSeeder } from '../../base-seeder';
import prisma from '../../../database/client';
import { SeederHelper } from '../utils/seeder-helper';

export class StockSeeder extends BaseSeeder {
  name = 'Stock';

  async seed(): Promise<void> {
    const productIds = await SeederHelper.getProductIds();

    if (productIds.length === 0) {
      console.log('   ⚠️  No products found. Skipping stock seeding.');
      return;
    }

    for (const productId of productIds) {
      await prisma.stock.upsert({
        where: { productId },
        update: {
          quantity: SeederHelper.randomInt(0, 100),
          stockVersion: SeederHelper.randomInt(1, 10),
        },
        create: {
          productId,
          quantity: SeederHelper.randomInt(0, 100),
          stockVersion: SeederHelper.randomInt(1, 10),
        },
      });
    }

    console.log(`   Created/Updated stock for ${productIds.length} products`);
  }
}

