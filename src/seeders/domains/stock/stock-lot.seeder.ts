import { BaseSeeder } from '../../base-seeder';
import prisma from '../../../database/client';
import { SeederHelper } from '../utils/seeder-helper';

const DAY_MS = 24 * 60 * 60 * 1000;

export class StockLotSeeder extends BaseSeeder {
  name = 'Stock Lots';

  async seed(): Promise<void> {
    const products = await prisma.product.findMany({
      select: {
        productId: true,
        hasExpiry: true,
        avgCost: true,
        lastPurchaseCost: true,
      },
    });
    const userId = await SeederHelper.getAdminUserId();

    if (products.length === 0) {
      console.log('⚠️ No products found. Skipping stock lot seeding.');
      return;
    }

    let lotCount = 0;

    for (const product of products) {
      const lotsForProduct = SeederHelper.randomInt(1, 3);
      let totalQty = 0;

      for (let i = 0; i < lotsForProduct; i++) {
        const quantity = SeederHelper.randomInt(5, 80);
        totalQty += quantity;

        const receivedAt = SeederHelper.randomDate(
          new Date(Date.now() - 120 * DAY_MS),
          new Date()
        );

        const expiredAt = product.hasExpiry
          ? new Date(receivedAt.getTime() + SeederHelper.randomInt(5, 120) * DAY_MS)
          : null;

        const baseCost =
          Number(product.avgCost ?? product.lastPurchaseCost ?? 0) ||
          SeederHelper.randomFloat(5, 100);

        const lot = await prisma.stockLot.create({
          data: {
            productId: product.productId,
            qtyOnHand: quantity,
            receivedAt,
            expiredAt,
            cost: baseCost,
          },
        });

        await prisma.stockMovement.create({
          data: {
            productId: product.productId,
            lotId: lot.id,
            movementType: 'STOCK_IN',
            quantity,
            cost: baseCost,
            createdBy: userId,
            createdAt: receivedAt,
          },
        });

        lotCount += 1;
      }

      await prisma.stock.upsert({
        where: { productId: product.productId },
        update: {
          quantity: totalQty,
          stockVersion: { increment: 1 },
          updatedAt: new Date(),
        },
        create: {
          productId: product.productId,
          quantity: totalQty,
          stockVersion: 1,
          updatedAt: new Date(),
        },
      });
    }

    console.log(`   Created ${lotCount} stock lots`);
  }
}
