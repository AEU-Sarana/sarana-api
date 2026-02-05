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

    const totals = await prisma.stockLot.groupBy({
      by: ['productId'],
      _sum: { qtyOnHand: true },
    });
    const totalMap = new Map<number, number>(
      totals.map((row) => [row.productId, Number(row._sum.qtyOnHand || 0)])
    );

    for (const productId of productIds) {
      const quantity = totalMap.get(productId) ?? 0;
      await prisma.stock.upsert({
        where: { productId },
        update: {
          quantity,
          stockVersion: { increment: 1 },
          updatedAt: new Date(),
        },
        create: {
          productId,
          quantity,
          stockVersion: 1,
          updatedAt: new Date(),
        },
      });
    }

    console.log(`Synced stock totals for ${productIds.length} products`);
  }
}
