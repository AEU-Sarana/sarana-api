import { BaseSeeder } from '../../base-seeder';
import prisma from '../../../database/client';
import { SeederHelper } from '../utils/seeder-helper';

export class TelegramConfigSeeder extends BaseSeeder {
  name = 'Telegram Config';

  async seed(): Promise<void> {
    const adminUserId = await SeederHelper.getAdminUserId();

    // Check if config already exists
    const existingConfig = await prisma.telegramConfig.findFirst({
      where: { isActive: true },
    });

    if (existingConfig) {
      await prisma.telegramConfig.update({
        where: { configId: existingConfig.configId },
        data: {
          botToken: 'YOUR_BOT_TOKEN_HERE',
          groupChatId: '-1001234567890',
          isActive: true,
          updatedBy: adminUserId,
        },
      });
      console.log('   Updated existing telegram config');
    } else {
      await prisma.telegramConfig.create({
        data: {
          botToken: 'YOUR_BOT_TOKEN_HERE',
          groupChatId: '-1001234567890',
          isActive: true,
          createdBy: adminUserId,
          updatedBy: adminUserId,
        },
      });
      console.log('   Created telegram config (update with real values)');
    }
  }
}

