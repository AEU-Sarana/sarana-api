import { eventBus } from '@src/shared/events/event-bus';
import { logger } from '@src/shared/utils/logger';
import { StockUpdatedEvent } from './stock-updated.event';
import { StockMovementCreatedEvent } from './stock-movement-created.event';

export function registerStockEventListeners(): void {
  eventBus.on('stock.updated', (payload: StockUpdatedEvent) => {
    logger.info('Event stock.updated', payload);
  });

  eventBus.on('stock.movement.created', (payload: StockMovementCreatedEvent) => {
    logger.info('Event stock.movement.created', payload);
  });
}