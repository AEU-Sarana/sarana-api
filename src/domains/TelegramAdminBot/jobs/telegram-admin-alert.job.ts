import prisma from '@src/database/client';
import { TelegramAdminInventoryService } from '@src/domains/TelegramAdminBot/services/telegram-admin-inventory.service';

export async function runTelegramAdminAlertsJob() {
  const activeConfigs = await prisma.telegramConfig.findMany({
    where: { isActive: true },
    select: { createdBy: true }
  });

  if (activeConfigs.length > 0) {
    await TelegramAdminInventoryService.sendNearExpiryAlert();
  }
}
