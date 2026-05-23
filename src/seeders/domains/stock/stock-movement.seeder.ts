import { BaseSeeder } from '../../base-seeder';
import prisma from '../../../database/client';
import { SeederHelper } from '../utils/seeder-helper';

export class StockMovementSeeder extends BaseSeeder {
  name = 'Stock Movements';

  async seed(): Promise<void> {
    const products = await prisma.product.findMany({
      select: {
        productId: true,
        hasExpiry: true,
        avgCost: true,
        lastPurchaseCost: true,
      },
    });
    const orderIds = await SeederHelper.getOrderIds();
    const userId = await SeederHelper.getAdminUserId();

    if (products.length === 0) {
      console.log('   ⚠️  No products found. Skipping stock movement seeding.');
      return;
    }

    const lotsRaw = await prisma.stockLot.findMany({
      select: {
        id: true,
        productId: true,
        qtyOnHand: true,
        cost: true,
      },
    });
    const lots = lotsRaw.map((lot) => ({
      ...lot,
      cost: lot.cost != null ? Number(lot.cost) : null,
    }));

    if (lots.length === 0) {
      console.log('   ⚠️  No stock lots found. Skipping stock movement seeding.');
      return;
    }

    const movements = [];
    const movementTypes = ['STOCK_IN', 'STOCK_OUT', 'ADJUSTMENT', 'RETURN'];

    // Create stock movements for the last 60 days
    for (let i = 0; i < 100; i++) {
      const movementType = SeederHelper.randomElement(movementTypes);
      const createdAt = SeederHelper.randomDate(
        new Date(Date.now() - 60 * 24 * 60 * 60 * 1000), // 60 days ago
        new Date()
      );

      if (movementType === 'STOCK_IN') {
        const product = SeederHelper.randomElement(products);
        const quantity = SeederHelper.randomInt(1, 50);
        const receivedAt = createdAt;
        const expiredAt = product.hasExpiry
          ? new Date(receivedAt.getTime() + SeederHelper.randomInt(5, 120) * 24 * 60 * 60 * 1000)
          : null;
        const baseCost =
          Number(product.avgCost ?? product.lastPurchaseCost ?? 0) ||
          SeederHelper.randomFloat(5, 100);

        const { movement, lotId } = await prisma.$transaction(async (tx) => {
          const lot = await tx.stockLot.create({
            data: {
              productId: product.productId,
              qtyOnHand: quantity,
              receivedAt,
              expiredAt,
              cost: baseCost,
            },
          });

          const movement = await tx.stockMovement.create({
            data: {
              productId: product.productId,
              lotId: lot.id,
              movementType: 'STOCK_IN',
              quantity,
              cost: baseCost,
              supplier: 'Seeder Supplier',
              createdBy: userId,
              createdAt,
            },
          });

          await tx.stock.update({
            where: { productId: product.productId },
            data: {
              quantity: { increment: quantity },
              stockVersion: { increment: 1 },
              updatedAt: new Date(),
            },
          });

          return { movement, lotId: lot.id };
        });

        lots.push({
          id: lotId,
          productId: product.productId,
          qtyOnHand: quantity,
          cost: baseCost,
        });

        movements.push(movement);
        continue;
      }

      const availableLots = lots.filter((lot) => lot.qtyOnHand > 0);
      if (availableLots.length === 0) {
        break;
      }

      const selectedLot = SeederHelper.randomElement(availableLots);
      const maxQty = Math.min(50, selectedLot.qtyOnHand);
      if (maxQty <= 0) continue;

      let quantity = SeederHelper.randomInt(1, maxQty);
      let movementQuantity = quantity;
      let delta = quantity;

      if (movementType === 'STOCK_OUT') {
        movementQuantity = -quantity;
        delta = -quantity;
      } else if (movementType === 'ADJUSTMENT') {
        const increase = Math.random() > 0.5;
        if (!increase) {
          movementQuantity = -quantity;
          delta = -quantity;
        }
      } else if (movementType === 'RETURN') {
        movementQuantity = quantity;
        delta = quantity;
      }

      const movementData: any = {
        productId: selectedLot.productId,
        lotId: selectedLot.id,
        movementType,
        quantity: movementQuantity,
        cost: selectedLot.cost ?? SeederHelper.randomFloat(5, 100),
        price: SeederHelper.randomFloat(10, 200),
        createdBy: userId,
        createdAt,
      };

      // Add order_id for STOCK_OUT movements
      if (movementType === 'STOCK_OUT' && orderIds.length > 0) {
        movementData.orderId = SeederHelper.randomElement(orderIds);
      }

      // Add supplier for STOCK_IN
      if (movementType === 'STOCK_IN') {
        const suppliers = ['Supplier A', 'Supplier B', 'Supplier C', 'Local Market'];
        movementData.supplier = SeederHelper.randomElement(suppliers);
      }

      // Add reason for ADJUSTMENT
      if (movementType === 'ADJUSTMENT') {
        const reasons = ['Inventory correction', 'Damaged goods', 'Expired items', 'Found items'];
        movementData.reason = SeederHelper.randomElement(reasons);
      }

      const movement = await prisma.$transaction(async (tx) => {
        await tx.stockLot.update({
          where: { id: selectedLot.id },
          data: {
            qtyOnHand: { increment: delta },
            updatedAt: new Date(),
          },
        });

        const created = await tx.stockMovement.create({
          data: movementData,
        });

        await tx.stock.update({
          where: { productId: selectedLot.productId },
          data: {
            quantity: { increment: delta },
            stockVersion: { increment: 1 },
            updatedAt: new Date(),
          },
        });

        return created;
      });

      selectedLot.qtyOnHand += delta;
      movements.push(movement);
    }

    console.log(`   Created ${movements.length} stock movements`);
  }
}
