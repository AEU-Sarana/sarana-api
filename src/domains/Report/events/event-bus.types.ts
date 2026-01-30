import { ReportGeneratedEvent } from './report-generated.event';
import { ReportExportedEvent } from './report-exported.event';
import { StockUpdatedEvent } from '@src/domains/Stock/events/stock-updated.event';
import { StockMovementCreatedEvent } from '@src/domains/Stock/events/stock-movement-created.event';

/**
 * EventMap interface for type-safe event handling
 * This can be used for TypeScript type checking when emitting/listening to events
 */
export interface EventMap {
  'stock.updated': StockUpdatedEvent;
  'stock.movement.created': StockMovementCreatedEvent;
  'reports.generated': ReportGeneratedEvent;
  'reports.exported': ReportExportedEvent;
}