import { eventBus } from '@src/shared/events/event-bus';
import { logger } from '@src/shared/utils/logger';
import { ReportGeneratedEvent } from './report-generated.event';
import { ReportExportedEvent } from './report-exported.event';

export function registerReportEventListeners(): void {
  eventBus.on('reports.generated', (payload: ReportGeneratedEvent) => {
    logger.info('Event reports.generated', {
      report_type: payload.report_type,
      generated_by: payload.generated_by,
      generated_at: payload.generated_at,
    });
  });

  eventBus.on('reports.exported', (payload: ReportExportedEvent) => {
    logger.info('Event reports.exported', {
      report_type: payload.report_type,
      file_name: payload.file_name,
      exported_by: payload.exported_by,
      exported_at: payload.exported_at,
    });
  });
}