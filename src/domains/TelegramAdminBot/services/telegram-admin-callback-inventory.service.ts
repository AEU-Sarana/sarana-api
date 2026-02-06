import type { TelegramAdminCallbackResult } from '@src/domains/TelegramAdminBot/types/telegram-admin-callback.types';
import { TelegramAdminInventoryService } from './telegram-admin-inventory.service';

type CallbackContext = {
  chatId: number;
  telegramUserId: number;
  adminUserId: number;
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
      return TelegramAdminInventoryService.buildLowStockMessage(ctx.adminUserId);
    }

    if (callbackData === 'SHIFT_SUMMARY' || callbackData === 'action:shift_summary') {
      return TelegramAdminInventoryService.buildShiftSummaryMessage(ctx.adminUserId);
    }

    if (callbackData === 'inv_on_hand' || callbackData === 'action:inventory_on_hand') {
      return TelegramAdminInventoryService.buildInventoryOnHandMessage();
    }

    if (callbackData === 'inv_value' || callbackData === 'action:inventory_value') {
      return TelegramAdminInventoryService.buildInventoryValueMessage();
    }

    if (callbackData === 'inv_reorder' || callbackData === 'action:inventory_reorder') {
      return TelegramAdminInventoryService.buildReorderAlertsMessage();
    }

    if (callbackData === 'inv_near_expiry' || callbackData === 'action:inventory_near_expiry') {
      return TelegramAdminInventoryService.buildNearExpiryMessage();
    }

    return null;
  }
}
