import { TelegramAdminInventoryService } from '@src/domains/TelegramAdminBot/services/telegram-admin-inventory.service';

export async function runTelegramAdminAlertsJob() {
  await TelegramAdminInventoryService.sendNearExpiryAlert();
}
