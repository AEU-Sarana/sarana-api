import prisma from '../database/client';
import { UserSeeder } from './domains/auth/user.seeder';
import { ProductSeeder } from './domains/product/product.seeder';
import { StockSeeder } from './domains/stock/stock.seeder';
import { StockLotSeeder } from './domains/stock/stock-lot.seeder';
import { ShiftSeeder } from './domains/shift/shift.seeder';
import { OrderSeeder } from './domains/order/order.seeder';
import { OrderItemSeeder } from './domains/order/order-item.seeder';
import { StockMovementSeeder } from './domains/stock/stock-movement.seeder';
import { DeviceBindingSeeder } from './domains/device-binding/device-binding.seeder';
import { AppSettingsSeeder } from './domains/settings/app-settings.seeder';
import { TelegramConfigSeeder } from './domains/telegram/telegram-config.seeder';
import { AuditLogSeeder } from './domains/shared/audit-log.seeder';

/**
 * Main seeder function
 * Runs all seeders in the correct order based on dependencies
 */
async function main() {
  console.log('🌱Starting database seeding...\n');

  const seeders = [
    // 1. Base data (no dependencies)
    new UserSeeder(),
    
    // 2. Products (depends on users)
    new ProductSeeder(),
    
    // 3. Stock lots (depends on products)
    new StockLotSeeder(),
    
    // 4. Shifts (depends on users)
    new ShiftSeeder(),
    
    // 5. Orders (depends on users, shifts, products)
    new OrderSeeder(),
    new OrderItemSeeder(), // Order items are created with orders, but keeping for consistency
    
    // 6. Stock Movements (depends on products, orders, shifts, users, stock lots)
    new StockMovementSeeder(),

    // 7. Stock totals (sync from stock lots)
    new StockSeeder(),
    
    // 8. Device Bindings (depends on users)
    new DeviceBindingSeeder(),
    
    // 9. Settings (depends on users)
    new AppSettingsSeeder(),
    
    // 10. Telegram Config (depends on users)
    new TelegramConfigSeeder(),
    
    // 11. Audit Logs (depends on users, but can be independent)
    new AuditLogSeeder(),
  ];

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
      prisma.shift.count(),
      prisma.order.count(),
      prisma.orderItem.count(),
      prisma.stockMovement.count(),
      prisma.deviceBinding.count(),
      prisma.appSetting.count(),
      prisma.telegramConfig.count(),
      prisma.auditLog.count(),
    ]);

    console.log('\n📊 Seeding Summary:');
    console.log('===================');
    console.log(`Users: ${counts[0]}`);
    console.log(`Products: ${counts[1]}`);
    console.log(`Stock Records: ${counts[2]}`);
    console.log(`Stock Lots: ${counts[3]}`);
    console.log(`Shifts: ${counts[4]}`);
    console.log(`Orders: ${counts[5]}`);
    console.log(`Order Items: ${counts[6]}`);
    console.log(`Stock Movements: ${counts[7]}`);
    console.log(`Device Bindings: ${counts[8]}`);
    console.log(`App Settings: ${counts[9]}`);
    console.log(`Telegram Configs: ${counts[10]}`);
    console.log(`Audit Logs: ${counts[11]}`);
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
