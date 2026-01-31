import { eventBus } from '@src/shared/events/event-bus';
import { logger } from '@src/shared/utils/logger';
import { TelegramService } from '@src/domains/Telegram/services/telegram.service';
import { StockUpdatedEvent } from '@src/domains/Stock/events/stock-updated.event';

import { ShiftClosedEvent } from '@src/domains/Shift/events/shift-closed.event';

export function registerTelegramEventListeners(): void {
  eventBus.on('stock.updated', async (payload: StockUpdatedEvent) => {
    try {
      await TelegramService.sendLowStockAlert(payload.product_id);
    } catch (error: any) {
      logger.error('Telegram low stock alert failed', {
        product_id: payload.product_id,
        error: error.message,
      });
    }
  });

  eventBus.on('shift.closed', async (payload: ShiftClosedEvent) => {
    try {
      await TelegramService.sendDailyReport(
        payload.shift_id,
        payload.performed_by,
        payload.performed_by_role
      );
    } catch (error: any) {
      logger.error('Telegram shift closed report failed', {
        shift_id: payload.shift_id,
        error: error.message,
      });
    }
  });
}

