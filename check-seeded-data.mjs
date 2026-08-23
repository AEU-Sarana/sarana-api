import client from './src/database/client';
const prisma = client.default || client;

async function checkSeededData() {
  try {
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
    ]);

    console.log('\n📊 Database Record Counts:');
    console.log('==========================');
    console.log(`Users:              ${counts[0]}`);
    console.log(`Products:           ${counts[1]}`);
    console.log(`Stock Records:       ${counts[2]}`);
    console.log(`Stock Lots:          ${counts[3]}`);
    console.log(`Orders:              ${counts[4]}`);
    console.log(`Order Items:         ${counts[5]}`);
    console.log(`Stock Movements:     ${counts[6]}`);
    console.log(`App Settings:       ${counts[7]}`);
    console.log(`Audit Logs:          ${counts[8]}`);
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
  }
}

checkSeededData();
