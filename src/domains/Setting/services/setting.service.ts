import prisma from '@src/database/client';
import { ValidationException } from '@src/shared/exceptions';
import { auditLogService } from '@src/shared/services/audit-log.service';
import { eventBus } from '@src/shared/events/event-bus';
import { GetSettingsResponse, UpdateSettingsRequest, UpdateSettingsResponse } from '@src/domains/Setting/types';
import { SettingsUpdatedEvent } from '@src/domains/Setting/events/settings-updated.event';

export class SettingService {
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
      device_binding_enabled: settings.deviceBindingEnabled,
      stock_sync_policy: settings.stockSyncPolicy,
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

    const updated = existing
      ? await prisma.appSetting.update({
          where: { settingId: existing.settingId },
          data: {
            autoBackup: request.auto_backup,
            backupFrequency: request.backup_frequency,
            deviceBindingEnabled: request.device_binding_enabled,
            stockSyncPolicy: request.stock_sync_policy,
            updatedBy: currentUserId,
          },
        })
      : await prisma.appSetting.create({
          data: {
            autoBackup: request.auto_backup,
            backupFrequency: request.backup_frequency,
            deviceBindingEnabled: request.device_binding_enabled,
            stockSyncPolicy: request.stock_sync_policy,
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
        device_binding_enabled: request.device_binding_enabled,
        stock_sync_policy: request.stock_sync_policy,
      },
    });

    eventBus.emit('settings.updated', {
      setting_id: updated.settingId,
      auto_backup: updated.autoBackup,
      backup_frequency: updated.backupFrequency,
      device_binding_enabled: updated.deviceBindingEnabled,
      stock_sync_policy: updated.stockSyncPolicy,
      updated_at: updated.updatedAt,
      updated_by: updated.updatedBy,
    } satisfies SettingsUpdatedEvent);

    return {
      auto_backup: updated.autoBackup,
      backup_frequency: updated.backupFrequency,
      device_binding_enabled: updated.deviceBindingEnabled,
      stock_sync_policy: updated.stockSyncPolicy,
      updated_at: updated.updatedAt,
      updated_by: updated.updatedBy,
    };
  }
}
