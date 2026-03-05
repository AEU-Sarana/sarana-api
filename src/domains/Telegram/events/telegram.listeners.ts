import { eventBus } from '@src/shared/events/event-bus';
import { logger } from '@src/shared/utils/logger';
import { TelegramService } from '@src/domains/Telegram/services/telegram.service';
import { ShiftClosedEvent } from '@src/domains/Shift/events/shift-closed.event';
import { BackupCreatedEvent, BackupFailedEvent } from '@src/domains/Backup/events';

export function registerTelegramEventListeners(): void {
  eventBus.on('shift.closed', async (payload: ShiftClosedEvent) => {
    try {
      await TelegramService.sendDailyReport(
        payload.shift_id,
        payload.performed_by,
        payload.performed_by_role,
        payload.tenant_id
      );
    } catch (error: any) {
      logger.error('Telegram shift closed report failed', {
        shift_id: payload.shift_id,
        error: error.message,
      });
    }
  });

  eventBus.on('backup.created', async (payload: BackupCreatedEvent) => {
    try {
      const sizeKb = (payload.file_size / 1024).toFixed(2);
      const message =
        `✅ *Backup Created*\n` +
        `Name: \`${payload.backup_name}\`\n` +
        `Type: ${payload.run_type}\n` +
        `Size: ${sizeKb} KB\n` +
        `Time: ${payload.created_at.toISOString()}`;

      await TelegramService.sendCustomMessage(message, 'Markdown');
    } catch (error: any) {
      logger.error('Telegram backup created notification failed', {
        backup_id: payload.backup_id,
        error: error.message,
      });
    }
  });

  eventBus.on('backup.failed', async (payload: BackupFailedEvent) => {
    try {
      const message =
        `❌ *Backup Failed*\n` +
        `Run Type: ${payload.run_type}\n` +
        `Code: \`${payload.error_code}\`\n` +
        `Message: ${payload.error_message}\n` +
        `Time: ${payload.occurred_at.toISOString()}`;

      await TelegramService.sendCustomMessage(message, 'Markdown');
    } catch (error: any) {
      logger.error('Telegram backup failed notification failed', {
        error_code: payload.error_code,
        error: error.message,
      });
    }
  });
}
