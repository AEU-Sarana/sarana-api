import { BaseSeeder } from '../../base-seeder';
import prisma from '../../../database/client';
import { SeederHelper } from '../utils/seeder-helper';

export class AppSettingsSeeder extends BaseSeeder {
  name = 'App Settings';

  async seed(): Promise<void> {
    const adminUserId = await SeederHelper.getAdminUserId();
    const adminUser = await prisma.user.findUnique({
      where: { userId: adminUserId },
      select: { tenantId: true },
    });
    const tenantId = adminUser?.tenantId ?? 1;

    // Check if settings already exist
    const existingSettings = await prisma.appSetting.findFirst({
      where: { tenantId },
    });

    if (existingSettings) {
      await prisma.appSetting.update({
        where: { settingId: existingSettings.settingId },
        data: {
          autoBackup: true,
          backupFrequency: 'daily',
          deviceBindingEnabled: true,
          stockSyncPolicy: 'allow_with_cached',
          tenantId,
          updatedBy: adminUserId,
        },
      });
      console.log('   Updated existing app settings');
    } else {
      await prisma.appSetting.create({
        data: {
          autoBackup: true,
          backupFrequency: 'daily',
          deviceBindingEnabled: true,
          stockSyncPolicy: 'allow_with_cached',
          tenantId,
          updatedBy: adminUserId,
        },
      });
      console.log('   Created app settings');
    }
  }
}
