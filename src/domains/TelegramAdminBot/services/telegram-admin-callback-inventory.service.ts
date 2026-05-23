import type { TelegramAdminCallbackResult } from '@src/domains/TelegramAdminBot/types/telegram-admin-callback.types';
import { TelegramAdminInventoryService } from './telegram-admin-inventory.service';

type CallbackContext = {
  chatId: number;
  telegramUserId: number;
  adminUserId: number;
  tenantId: number;
};

export class TelegramAdminCallbackInventoryService {
  static async handle(
    callbackData: string,
    ctx: CallbackContext
  ): Promise<TelegramAdminCallbackResult | null> {
    if (
      callbackData === 'LOW_STOCK' ||
      callbackData === 'inv_low_stock' ||
      callbackData === 'action:inventory_low_stock'
    ) {
      return TelegramAdminInventoryService.buildLowStockMessage(ctx.adminUserId, ctx.tenantId);
    }

    if (callbackData === 'inv_on_hand' || callbackData === 'action:inventory_on_hand') {
      return TelegramAdminInventoryService.buildInventoryOnHandMessage(ctx.tenantId);
    }

    if (callbackData === 'inv_value' || callbackData === 'action:inventory_value') {
      return TelegramAdminInventoryService.buildInventoryValueMessage(ctx.tenantId);
    }

    if (callbackData === 'inv_reorder' || callbackData === 'action:inventory_reorder') {
      return TelegramAdminInventoryService.buildReorderAlertsMessage(ctx.tenantId);
    }

    if (callbackData === 'inv_near_expiry' || callbackData === 'action:inventory_near_expiry') {
      return TelegramAdminInventoryService.buildNearExpiryMessage(undefined, ctx.tenantId);
    }

    return null;
  }
}
