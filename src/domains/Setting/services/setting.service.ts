import prisma from '@src/database/client';
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
   * Get current app settings (includes receipt / invoice info)
   */
  static async getSettings(
    currentUserId: number,
    tenantId?: number
  ): Promise<GetSettingsResponse> {
    let settings = await prisma.appSetting.findFirst({
      orderBy: { updatedAt: 'desc' },
    });

    if (!settings) {
      settings = await prisma.appSetting.create({
        data: {
          updatedBy: currentUserId,
        },
      });
    }

    // Fetch receipt setting (auto-create if missing)
    let receipt = await prisma.receiptSetting.findFirst({
      orderBy: { updatedAt: 'desc' },
    });
    if (!receipt) {
      receipt = await prisma.receiptSetting.create({
        data: {
          storeName: 'My Store',
          isLogoEnabled: true,
          isFooterEnabled: true,
          updatedBy: currentUserId,
        } as any,
      });
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
      stock_sync_policy: settings.stockSyncPolicy,
      report_send_enabled: settings.reportSendEnabled ?? true,
      report_send_time: this.formatTime(settings.reportSendTime, '23:30'),
      report_send_timezone: settings.reportSendTimezone || 'Asia/Phnom_Penh',
      updated_at: settings.updatedAt,
      updated_by: settings.updatedBy,
      // Invoice / Receipt info
      store_name: receipt.storeName,
      store_logo_path: receipt.logoPath,
      store_phone: receipt.phone,
      store_address: receipt.address,
      store_tax_id: receipt.taxId,
      store_footer_note: receipt.footerNote,
      is_logo_enabled: receipt.isLogoEnabled,
      is_footer_enabled: receipt.isFooterEnabled,
    };
  }

  /**
   * Update app settings (also updates receipt / invoice info when provided)
   */
  static async updateSettings(
    request: UpdateSettingsRequest,
    currentUserId: number,
    tenantId?: number
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
            stockSyncPolicy: request.stock_sync_policy,
            reportSendEnabled,
            reportSendTime,
            reportSendTimezone,
            updatedBy: currentUserId,
          },
        });

    // ── Update receipt / invoice info (when store_name or any invoice field is provided) ──
    const hasReceiptFields =
      request.store_name !== undefined ||
      request.store_phone !== undefined ||
      request.store_address !== undefined ||
      request.store_tax_id !== undefined ||
      request.store_footer_note !== undefined ||
      request.is_logo_enabled !== undefined ||
      request.is_footer_enabled !== undefined;

    let receipt = await prisma.receiptSetting.findFirst({
      orderBy: { updatedAt: 'desc' },
    });

    if (!receipt) {
      receipt = await prisma.receiptSetting.create({
        data: {
          storeName: request.store_name ?? 'My Store',
          phone: request.store_phone ?? null,
          address: request.store_address ?? null,
          taxId: request.store_tax_id ?? null,
          footerNote: request.store_footer_note ?? null,
          isLogoEnabled: request.is_logo_enabled ?? true,
          isFooterEnabled: request.is_footer_enabled ?? true,
          updatedBy: currentUserId,
        } as any,
      });
    } else if (hasReceiptFields) {
      receipt = await prisma.receiptSetting.update({
        where: { settingId: receipt.settingId },
        data: {
          ...(request.store_name !== undefined && { storeName: request.store_name }),
          ...(request.store_phone !== undefined && { phone: request.store_phone || null }),
          ...(request.store_address !== undefined && { address: request.store_address || null }),
          ...(request.store_tax_id !== undefined && { taxId: request.store_tax_id || null }),
          ...(request.store_footer_note !== undefined && { footerNote: request.store_footer_note || null }),
          ...(request.is_logo_enabled !== undefined && { isLogoEnabled: request.is_logo_enabled }),
          ...(request.is_footer_enabled !== undefined && { isFooterEnabled: request.is_footer_enabled }),
          updatedBy: currentUserId,
          updatedAt: new Date(),
        } as any,
      });
    }

    await auditLogService.createAuditLog({
      userId: currentUserId,
      action: 'UPDATE_SETTINGS',
      entityType: 'AppSetting',
      entityId: updated.settingId,
      newValues: {
        auto_backup: request.auto_backup,
        backup_frequency: request.backup_frequency,
        stock_sync_policy: request.stock_sync_policy,
        report_send_enabled: reportSendEnabled,
        report_send_time: this.formatTime(reportSendTime, '23:30'),
        report_send_timezone: reportSendTimezone,
        ...(hasReceiptFields && {
          store_name: receipt?.storeName,
          store_phone: receipt?.phone,
          store_address: receipt?.address,
          store_tax_id: receipt?.taxId,
          store_footer_note: receipt?.footerNote,
          is_logo_enabled: receipt?.isLogoEnabled,
          is_footer_enabled: receipt?.isFooterEnabled,
        }),
      },
    });

    eventBus.emit('settings.updated', {
      setting_id: updated.settingId,
      auto_backup: updated.autoBackup,
      backup_frequency: updated.backupFrequency,
      backup_schedule_time: '',
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
      stock_sync_policy: updated.stockSyncPolicy,
      report_send_enabled: updated.reportSendEnabled ?? true,
      report_send_time: this.formatTime(updated.reportSendTime, '23:30'),
      report_send_timezone: updated.reportSendTimezone || 'Asia/Phnom_Penh',
      updated_at: updated.updatedAt,
      updated_by: updated.updatedBy,
      // Invoice / Receipt info
      store_name: receipt?.storeName,
      store_logo_path: receipt?.logoPath,
      store_phone: receipt?.phone,
      store_address: receipt?.address,
      store_tax_id: receipt?.taxId,
      store_footer_note: receipt?.footerNote,
      is_logo_enabled: receipt?.isLogoEnabled,
      is_footer_enabled: receipt?.isFooterEnabled,
    };
  }
}
