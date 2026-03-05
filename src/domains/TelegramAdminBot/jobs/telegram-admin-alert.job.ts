import prisma from '@src/database/client';
import { TelegramAdminInventoryService } from '@src/domains/TelegramAdminBot/services/telegram-admin-inventory.service';

export async function runTelegramAdminAlertsJob() {
  const activeConfigs = await prisma.telegramConfig.findMany({
    where: { isActive: true },
    select: { createdBy: true }
  });

  for (const config of activeConfigs) {
    const user = await prisma.user.findUnique({
      where: { userId: config.createdBy },
      select: { tenantId: true }
    });

    if (user && user.tenantId) {
      await TelegramAdminInventoryService.sendNearExpiryAlert(user.tenantId);
    }
  }
}
