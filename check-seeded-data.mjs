import 'dotenv/config';
import prisma from './src/database/client.js';

async function checkSeededData() {
  try {
    const counts = await Promise.all([
      prisma.user.count(),
      prisma.product.count(),
      prisma.stock.count(),
      prisma.shift.count(),
      prisma.order.count(),
      prisma.orderItem.count(),
      prisma.stockMovement.count(),
      prisma.deviceBinding.count(),
      prisma.appSetting.count(),
      prisma.telegramConfig.count(),
      prisma.telegramAdminLinks.count(),
      prisma.telegramAdminMessages.count(),
      prisma.auditLog.count(),
    ]);

    console.log('\n📊 Database Record Counts:');
    console.log('==========================');
    console.log(`Users:              ${counts[0]}`);
    console.log(`Products:           ${counts[1]}`);
    console.log(`Stock Records:       ${counts[2]}`);
    console.log(`Shifts:              ${counts[3]}`);
    console.log(`Orders:              ${counts[4]}`);
    console.log(`Order Items:         ${counts[5]}`);
    console.log(`Stock Movements:     ${counts[6]}`);
    console.log(`Device Bindings:     ${counts[7]}`);
    console.log(`App Settings:       ${counts[8]}`);
    console.log(`Telegram Configs:   ${counts[9]}`);
    console.log(`Telegram Admin Links:   ${counts[10]}`);
    console.log(`Telegram Admin Messages:   ${counts[11]}`);
    console.log(`Audit Logs:          ${counts[12]}`);
    console.log('==========================\n');

    // Check if data exists
    const totalRecords = counts.reduce((sum, count) => sum + count, 0);
    if (totalRecords === 0) {
      console.log('⚠️  No data found. Run: pnpm seed:all');
    } else {
      console.log('✅ Database has seeded data!');
    }
  } catch (error) {
    console.error('❌ Error checking data:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkSeededData();
