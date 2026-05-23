import { BaseSeeder } from '../../base-seeder';
import prisma from '../../../database/client';
import { SeederHelper } from '../utils/seeder-helper';

export class AppSettingsSeeder extends BaseSeeder {
  name = 'App Settings';

  async seed(): Promise<void> {
    const adminUserId = await SeederHelper.getAdminUserId();

    // Check if settings already exist
    const existingSettings = await prisma.appSetting.findFirst();

    if (existingSettings) {
      await prisma.appSetting.update({
        where: { settingId: existingSettings.settingId },
        data: {
          autoBackup: true,
          backupFrequency: 'daily',
          stockSyncPolicy: 'allow_with_cached',
          updatedBy: adminUserId,
        },
      });
      console.log('   Updated existing app settings');
    } else {
      await prisma.appSetting.create({
        data: {
          autoBackup: true,
          backupFrequency: 'daily',
          stockSyncPolicy: 'allow_with_cached',
          updatedBy: adminUserId,
        },
      });
      console.log('   Created app settings');
    }
  }
}
