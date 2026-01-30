import { eventBus } from '@src/shared/events/event-bus';
import { logger } from '@src/shared/utils/logger';
import { TelegramService } from '@src/domains/Telegram/services/telegram.service';
import { StockUpdatedEvent } from '@src/domains/Stock/events/stock-updated.event';

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
}

