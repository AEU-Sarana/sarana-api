import prisma from '@src/database/client';
import { ValidationException } from '@src/shared/exceptions';
import { auditLogService } from '@src/shared/services/audit-log.service';

import { fileStorageService } from '@src/shared/services/file-storage.service';

export class ReceiptSettingService {
  static async getSettings(): Promise<any> {
    let settings = await prisma.receiptSetting.findFirst({
      orderBy: { updatedAt: 'desc' },
    });

    if (!settings) {
      settings = await prisma.receiptSetting.create({
        data: {
          storeName: 'My Store',
          isLogoEnabled: true,
          isFooterEnabled: true,
          updatedBy: 1,
        },
      });
    }

    return {
      setting_id: settings.settingId,
      store_name: settings.storeName,
      logo_path: settings.logoPath,
      phone: settings.phone,
      address: settings.address,
      tax_id: settings.taxId,
      footer_note: settings.footerNote,
      is_logo_enabled: settings.isLogoEnabled,
      is_footer_enabled: settings.isFooterEnabled,
      updated_at: settings.updatedAt,
      created_at: settings.createdAt,
    };
  }

  static async updateSettings(
    payload: {
      store_name: string;
      phone?: string;
      address?: string;
      tax_id?: string;
      footer_note?: string;
      is_logo_enabled?: boolean;
      is_footer_enabled?: boolean;
    },
    currentUserId: number
  ): Promise<any> {
    const existing = await prisma.receiptSetting.findFirst({
      orderBy: { updatedAt: 'desc' },
    });
    if (!existing) {
      throw new ValidationException('Receipt settings not initialized');
    }

    const updated = await prisma.receiptSetting.update({
      where: { settingId: existing.settingId },
      data: {
        storeName: payload.store_name,
        phone: payload.phone ?? null,
        address: payload.address ?? null,
        taxId: payload.tax_id ?? null,
        footerNote: payload.footer_note ?? null,
        isLogoEnabled: payload.is_logo_enabled ?? existing.isLogoEnabled,
        isFooterEnabled: payload.is_footer_enabled ?? existing.isFooterEnabled,
        updatedBy: currentUserId,
        updatedAt: new Date(),
      },
    });

    await auditLogService.createAuditLog({
      userId: currentUserId,
      action: 'RECEIPT_SETTINGS_UPDATED',
      resource: 'receiptSetting',
      entityId: updated.settingId,
      details: {
        old_values: {
          store_name: existing.storeName,
          logo_path: existing.logoPath,
          phone: existing.phone,
          address: existing.address,
          tax_id: existing.taxId,
          footer_note: existing.footerNote,
          is_logo_enabled: existing.isLogoEnabled,
          is_footer_enabled: existing.isFooterEnabled,
        },
        new_values: {
          store_name: updated.storeName,
          logo_path: updated.logoPath,
          phone: updated.phone,
          address: updated.address,
          tax_id: updated.taxId,
          footer_note: updated.footerNote,
          is_logo_enabled: updated.isLogoEnabled,
          is_footer_enabled: updated.isFooterEnabled,
        },
      },
    });

    return {
      setting_id: updated.settingId,
      store_name: updated.storeName,
      logo_path: updated.logoPath,
      phone: updated.phone,
      address: updated.address,
      tax_id: updated.taxId,
      footer_note: updated.footerNote,
      is_logo_enabled: updated.isLogoEnabled,
      is_footer_enabled: updated.isFooterEnabled,
      updated_at: updated.updatedAt,
    };
  }
  static async uploadLogo(
    file: Express.Multer.File,
    currentUserId: number
  ): Promise<any> {
    const existing = await prisma.receiptSetting.findFirst({
      orderBy: { updatedAt: 'desc' },
    });
    if (!existing) {
      throw new ValidationException('Receipt settings not initialized');
    }

    // Upload file to storage
    const uploadResult = await fileStorageService.uploadFile(
      file,
      'settings/logo',
      {
        contentType: file.mimetype,
        metadata: {
          uploadedBy: String(currentUserId),
          type: 'RECEIPT_LOGO',
        },
      }
    );

    const updated = await prisma.receiptSetting.update({
      where: { settingId: existing.settingId },
      data: {
        logoPath: uploadResult.url,
        updatedBy: currentUserId,
        updatedAt: new Date(),
      },
    });

    await auditLogService.createAuditLog({
      userId: currentUserId,
      action: 'RECEIPT_LOGO_UPDATED',
      resource: 'receiptSetting',
      entityId: updated.settingId,
      details: {
        old_value: existing.logoPath,
        new_value: updated.logoPath,
      },
    });

    return {
      logo_path: updated.logoPath,
      updated_at: updated.updatedAt,
    };
  }
}