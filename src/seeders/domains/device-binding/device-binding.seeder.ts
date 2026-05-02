import { BaseSeeder } from '../../base-seeder';
import prisma from '../../../database/client';
import { SeederHelper } from '../utils/seeder-helper';
import { DataGenerator } from '../utils/data-generator';

export class DeviceBindingSeeder extends BaseSeeder {
  name = 'Device Bindings';

  async seed(): Promise<void> {
    const sellers = await prisma.user.findMany({
      where: { role: 'CASHIER' },
      select: { userId: true },
    });

    if (sellers.length === 0) {
      console.log('   ⚠️  No sellers found. Skipping device binding seeding.');
      return;
    }

    const adminUserId = await SeederHelper.getAdminUserId();
    const deviceNames = ['iPhone 12', 'Samsung Galaxy', 'iPad Pro', 'Android Tablet', 'POS Device'];

    for (const seller of sellers) {
      // 70% chance of having a device binding
      if (Math.random() > 0.3) {
        const deviceId = DataGenerator.generateDeviceId();
        const status = Math.random() > 0.2 ? 'APPROVED' : 'REVOKED';
        
        await prisma.deviceBinding.create({
          data: {
            userId: seller.userId,
            deviceId,
            deviceName: SeederHelper.randomElement(deviceNames),
            status,
            approvedBy: status === 'APPROVED' ? adminUserId : null,
            approvedAt: status === 'APPROVED' ? new Date() : null,
          },
        });

        // Update user's device binding status
        await prisma.user.update({
          where: { userId: seller.userId },
          data: {
            deviceId,
            isDeviceBound: status === 'APPROVED',
          },
        });
      }
    }

    const bindings = await prisma.deviceBinding.count();
    console.log(`   Created device bindings for sellers`);
  }
}

