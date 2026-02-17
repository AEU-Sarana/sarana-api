import prisma from '@src/database/client';
import { ValidationException } from '@src/shared/exceptions';
import { auditLogService } from '@src/shared/services/audit-log.service';
import { eventBus } from '@src/shared/events/event-bus';
import { GetSettingsResponse, UpdateSettingsRequest, UpdateSettingsResponse } from '@src/domains/Setting/types';
import { SettingsUpdatedEvent } from '@src/domains/Setting/events/settings-updated.event';

export class SettingService {
  private static formatTime(value: Date | null | undefined, fallback: string): string {
    if (!value) return fallback;
    const hours = value.getUTCHours().toString().padStart(2, '0');
    const minutes = value.getUTCMinutes().toString().padStart(2, '0');
    return `${hours}:${minutes}`;
  }

  private static parseTime(value: string): Date {
    const [hours, minutes] = value.split(':').map(Number);
    return new Date(Date.UTC(1970, 0, 1, hours, minutes, 0));
  }

  /**
   * Get current app settings
   */
  static async getSettings(currentUserId: number): Promise<GetSettingsResponse> {
    const settings = await prisma.appSetting.findFirst({
      orderBy: { updatedAt: 'desc' },
    });

    if (!settings) {
      throw new ValidationException('Settings not found', [], 'SETTINGS_NOT_FOUND', 404);
    }

    await auditLogService.createAuditLog({
      userId: currentUserId,
      action: 'VIEW_SETTINGS',
      entityType: 'AppSetting',
      entityId: settings.settingId,
    });

    return {
  auto_backup: settings.autoBackup,
  backup_frequency: settings.backupFrequency,
  // backup_schedule_time removed
      device_binding_enabled: settings.deviceBindingEnabled,
      stock_sync_policy: settings.stockSyncPolicy,
      report_send_enabled: settings.reportSendEnabled ?? true,
      report_send_time: this.formatTime(settings.reportSendTime, '23:30'),
      report_send_timezone: settings.reportSendTimezone || 'Asia/Phnom_Penh',
      updated_at: settings.updatedAt,
      updated_by: settings.updatedBy,
    };
  }

  /**
   * Update app settings
   */
  static async updateSettings(
    request: UpdateSettingsRequest,
    currentUserId: number
  ): Promise<UpdateSettingsResponse> {
    const existing = await prisma.appSetting.findFirst({
      orderBy: { updatedAt: 'desc' },
    });

    const reportSendEnabled =
      request.report_send_enabled ??
      existing?.reportSendEnabled ??
      true;
    const reportSendTimezone =
      request.report_send_timezone ??
      existing?.reportSendTimezone ??
      'Asia/Phnom_Penh';
    const reportSendTime = request.report_send_time
      ? this.parseTime(request.report_send_time)
      : existing?.reportSendTime ?? this.parseTime('23:30');
    const backupScheduleTime = request.backup_schedule_time
  ? this.parseTime(request.backup_schedule_time)
  : this.parseTime('23:30');

    const updated = existing
      ? await prisma.appSetting.update({
          where: { settingId: existing.settingId },
          data: {
            autoBackup: request.auto_backup,
            backupFrequency: request.backup_frequency,
            deviceBindingEnabled: request.device_binding_enabled,
            stockSyncPolicy: request.stock_sync_policy,
            reportSendEnabled,
            reportSendTime,
            reportSendTimezone,
            updatedBy: currentUserId,
          },
        })
      : await prisma.appSetting.create({
          data: {
            autoBackup: request.auto_backup,
            backupFrequency: request.backup_frequency,
            deviceBindingEnabled: request.device_binding_enabled,
            stockSyncPolicy: request.stock_sync_policy,
            reportSendEnabled,
            reportSendTime,
            reportSendTimezone,
            updatedBy: currentUserId,
          },
        });

    await auditLogService.createAuditLog({
      userId: currentUserId,
      action: 'UPDATE_SETTINGS',
      entityType: 'AppSetting',
      entityId: updated.settingId,
      newValues: {
        auto_backup: request.auto_backup,
        backup_frequency: request.backup_frequency,
        // backup_schedule_time removed
        device_binding_enabled: request.device_binding_enabled,
        stock_sync_policy: request.stock_sync_policy,
        report_send_enabled: reportSendEnabled,
        report_send_time: this.formatTime(reportSendTime, '23:30'),
        report_send_timezone: reportSendTimezone,
      },
    });

    eventBus.emit('settings.updated', {
  setting_id: updated.settingId,
  auto_backup: updated.autoBackup,
  backup_frequency: updated.backupFrequency,
  backup_schedule_time: '',
  device_binding_enabled: updated.deviceBindingEnabled,
  stock_sync_policy: updated.stockSyncPolicy,
  report_send_enabled: updated.reportSendEnabled ?? true,
  report_send_time: this.formatTime(updated.reportSendTime, '23:30'),
  report_send_timezone: updated.reportSendTimezone || 'Asia/Phnom_Penh',
  updated_at: updated.updatedAt,
  updated_by: updated.updatedBy,
    } satisfies SettingsUpdatedEvent);

    return {
      auto_backup: updated.autoBackup,
      backup_frequency: updated.backupFrequency,
  // backup_schedule_time removed
      device_binding_enabled: updated.deviceBindingEnabled,
      stock_sync_policy: updated.stockSyncPolicy,
      report_send_enabled: updated.reportSendEnabled ?? true,
      report_send_time: this.formatTime(updated.reportSendTime, '23:30'),
      report_send_timezone: updated.reportSendTimezone || 'Asia/Phnom_Penh',
      updated_at: updated.updatedAt,
      updated_by: updated.updatedBy,
    };
  }
}
