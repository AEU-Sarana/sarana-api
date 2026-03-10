import prisma from './src/database/client';
import { StockLotService } from './src/domains/Stock/services/stock-lot.service';

async function main() {
    const lots0 = await StockLotService.listLotsExpiringIn(1, 0);
    const lots7 = await StockLotService.listLotsExpiringIn(1, 7);
    const lots30 = await StockLotService.listLotsExpiringIn(1, 30);
    console.log('0 days:', JSON.stringify(lots0, null, 2));
    console.log('7 days:', JSON.stringify(lots7, null, 2));
    console.log('30 days:', JSON.stringify(lots30, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
