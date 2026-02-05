import { BaseSeeder } from '../../base-seeder';
import prisma from '../../../database/client';
import { SeederHelper } from '../utils/seeder-helper';

export class ShiftSeeder extends BaseSeeder {
  name = 'Shifts';

  async seed(): Promise<void> {
    const sellerIds = await prisma.user.findMany({
      where: { role: 'SELLER' },
      select: { userId: true },
    });

    if (sellerIds.length === 0) {
      console.log('   ⚠️  No sellers found. Skipping shift seeding.');
      return;
    }

    const shifts = [];
    const today = new Date();
    
    // Create shifts for the last 30 days
    for (let i = 0; i < 30; i++) {
      const shiftDate = new Date(today);
      shiftDate.setDate(shiftDate.getDate() - i);
      
      const seller = SeederHelper.randomElement<{ userId: number }>(sellerIds);
      const startTime = new Date(shiftDate);
      startTime.setHours(8, 0, 0, 0);
      
      const endTime = new Date(shiftDate);
      endTime.setHours(17, 0, 0, 0);
      
      const openingCash = SeederHelper.randomFloat(50, 200);
      const totalSalesAmount = SeederHelper.randomFloat(500, 5000);
      const totalSalesCount = SeederHelper.randomInt(10, 100);
      const actualCash = openingCash + totalSalesAmount + SeederHelper.randomFloat(-50, 50);
      
      const shift = await prisma.shift.create({
        data: {
          sellerId: seller.userId,
          shiftDate,
          startTime,
          endTime,
          openingCash,
          expectedCash: openingCash + totalSalesAmount,
          actualCash,
          shortAmount: actualCash < openingCash + totalSalesAmount ? openingCash + totalSalesAmount - actualCash : null,
          overAmount: actualCash > openingCash + totalSalesAmount ? actualCash - (openingCash + totalSalesAmount) : null,
          totalSalesCount,
          totalSalesAmount,
          stockVersion: SeederHelper.randomInt(1, 10),
          status: i < 7 ? 'ACTIVE' : 'CLOSED', // Last 7 days active
          reportSentStatus: i < 7 ? 'PENDING' : SeederHelper.randomElement(['SENT', 'FAILED', 'PENDING']),
        },
      });
      
      shifts.push(shift);
    }

    console.log(`   Created ${shifts.length} shifts`);
  }
}

