import { BaseSeeder } from '../../base-seeder';
import prisma from '../../../database/client';
import { SeederHelper } from '../utils/seeder-helper';

export class StockMovementSeeder extends BaseSeeder {
  name = 'Stock Movements';

  async seed(): Promise<void> {
    const productIds = await SeederHelper.getProductIds();
    const orderIds = await SeederHelper.getOrderIds();
    const shiftIds = await SeederHelper.getShiftIds();
    const userId = await SeederHelper.getAdminUserId();

    if (productIds.length === 0) {
      console.log('   ⚠️  No products found. Skipping stock movement seeding.');
      return;
    }

    const movements = [];
    const movementTypes = ['STOCK_IN', 'STOCK_OUT', 'ADJUSTMENT', 'RETURN'];

    // Create stock movements for the last 60 days
    for (let i = 0; i < 100; i++) {
      const productId = SeederHelper.randomElement(productIds);
      const movementType = SeederHelper.randomElement(movementTypes);
      const quantity = SeederHelper.randomInt(1, 50);
      
      const createdAt = SeederHelper.randomDate(
        new Date(Date.now() - 60 * 24 * 60 * 60 * 1000), // 60 days ago
        new Date()
      );

      const movementData: any = {
        productId,
        movementType,
        quantity,
        cost: SeederHelper.randomFloat(5, 100),
        price: SeederHelper.randomFloat(10, 200),
        createdBy: userId,
        createdAt,
      };

      // Add order_id for STOCK_OUT movements
      if (movementType === 'STOCK_OUT' && orderIds.length > 0) {
        movementData.orderId = SeederHelper.randomElement(orderIds);
      }

      // Add shift_id for some movements
      if (shiftIds.length > 0 && Math.random() > 0.5) {
        movementData.shiftId = SeederHelper.randomElement(shiftIds);
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

      const movement = await prisma.stockMovement.create({
        data: movementData,
      });

      movements.push(movement);
    }

    console.log(`   Created ${movements.length} stock movements`);
  }
}

