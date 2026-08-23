import prisma from '../database/client';
import { UserSeeder } from './domains/auth/user.seeder';
import { ProductSeeder } from './domains/product/product.seeder';
import { StockSeeder } from './domains/stock/stock.seeder';
import { StockLotSeeder } from './domains/stock/stock-lot.seeder';
import { OrderSeeder } from './domains/order/order.seeder';
import { OrderItemSeeder } from './domains/order/order-item.seeder';
import { StockMovementSeeder } from './domains/stock/stock-movement.seeder';
import { AppSettingsSeeder } from './domains/settings/app-settings.seeder';
import { AuditLogSeeder } from './domains/shared/audit-log.seeder';
import { CustomerSeeder } from './domains/customer/customer.seeder';
import { SupplierSeeder } from './domains/purchasing/supplier.seeder';
import { PurchaseOrderSeeder } from './domains/purchasing/po.seeder';

/**
 * Main seeder function
 * Runs all seeders in the correct order based on dependencies
 */

async function main() {
  console.log('🌱Starting database seeding...\n');

  const seeders = [
    // 1. Base data (no dependencies)
    new UserSeeder(),
  ];

  if (process.env.SEED_USERS_ONLY !== 'true') {
    seeders.push(
      // 2. Products (depends on users)
      new ProductSeeder(),

      // 3. Customers & Suppliers (needed before orders & POs)
      new CustomerSeeder(),
      new SupplierSeeder(),

      // 4. Stock lots (depends on products)
      new StockLotSeeder(),

      // 5. Orders (depends on users, products, customers)
      new OrderSeeder(),
      new OrderItemSeeder(),

      // 6. Purchase Orders (depends on suppliers)
      new PurchaseOrderSeeder(),

      // 7. Stock Movements (depends on products, orders, users, stock lots)
      new StockMovementSeeder(),

      // 8. Stock totals (sync from stock lots)
      new StockSeeder(),

      // 9. Settings (depends on users)
      new AppSettingsSeeder(),

      // 10. Audit Logs
      new AuditLogSeeder(),
    );
  }

  try {
    for (const seeder of seeders) {
      await seeder.run();
    }

    console.log('✨ Database seeding completed successfully!');

    // Print summary
    const counts = await Promise.all([
      prisma.user.count(),
      prisma.product.count(),
      prisma.stock.count(),
      prisma.stockLot.count(),
      prisma.order.count(),
      prisma.orderItem.count(),
      prisma.stockMovement.count(),
      prisma.appSetting.count(),
      prisma.auditLog.count(),
      prisma.customer.count(),
    ]);

    console.log('\n📊 Seeding Summary:');
    console.log('===================');
    console.log(`Users: ${counts[0]}`);
    console.log(`Products: ${counts[1]}`);
    console.log(`Stock Records: ${counts[2]}`);
    console.log(`Stock Lots: ${counts[3]}`);
    console.log(`Orders: ${counts[4]}`);
    console.log(`Order Items: ${counts[5]}`);
    console.log(`Stock Movements: ${counts[6]}`);
    console.log(`App Settings: ${counts[7]}`);
    console.log(`Audit Logs: ${counts[8]}`);
    console.log(`Customers: ${counts[9]}`);
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    throw error;
  }
}

// Run seeder
main()
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
