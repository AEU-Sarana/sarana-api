"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReceiptSettingService = void 0;
const client_1 = __importDefault(require("../../../../database/client"));
const exceptions_1 = require("../../../../shared/exceptions");
const audit_log_service_1 = require("../../../../shared/services/audit-log.service");
const file_storage_service_1 = require("../../../../shared/services/file-storage.service");
class ReceiptSettingService {
    static async getSettings(currentTenantId) {
        const resolvedTenantId = currentTenantId ?? 1;
        let settings = await client_1.default.receiptSetting.findFirst({
            where: { tenantId: resolvedTenantId },
            orderBy: { updatedAt: 'desc' },
        });
        if (!settings) {
            const createData = {
                storeName: 'My Store',
                isLogoEnabled: true,
                isFooterEnabled: true,
                tenantId: resolvedTenantId,
                updatedBy: 1,
            };
            settings = await client_1.default.receiptSetting.create({
                data: createData,
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
    static async updateSettings(payload, currentUserId, currentTenantId) {
        const resolvedTenantId = currentTenantId ?? 1;
        const existing = await client_1.default.receiptSetting.findFirst({
            where: { tenantId: resolvedTenantId },
            orderBy: { updatedAt: 'desc' },
        });
        if (!existing) {
            throw new exceptions_1.ValidationException('Receipt settings not initialized');
        }
        const updateData = {
            storeName: payload.store_name,
            phone: payload.phone ?? null,
            address: payload.address ?? null,
            taxId: payload.tax_id ?? null,
            footerNote: payload.footer_note ?? null,
            isLogoEnabled: payload.is_logo_enabled ?? existing.isLogoEnabled,
            isFooterEnabled: payload.is_footer_enabled ?? existing.isFooterEnabled,
            tenantId: resolvedTenantId,
            updatedBy: currentUserId,
            updatedAt: new Date(),
        };
        const updated = await client_1.default.receiptSetting.update({
            where: { settingId: existing.settingId },
            data: updateData,
        });
        await audit_log_service_1.auditLogService.createAuditLog({
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
    static async uploadLogo(file, currentUserId, currentTenantId) {
        const resolvedTenantId = currentTenantId ?? 1;
        const existing = await client_1.default.receiptSetting.findFirst({
            where: { tenantId: resolvedTenantId },
            orderBy: { updatedAt: 'desc' },
        });
        if (!existing) {
            throw new exceptions_1.ValidationException('Receipt settings not initialized');
        }
        // Upload file to storage
        const uploadResult = await file_storage_service_1.fileStorageService.uploadFile(file, 'settings/logo', {
            contentType: file.mimetype,
            metadata: {
                uploadedBy: String(currentUserId),
                type: 'RECEIPT_LOGO',
            },
        });
        const updateData = {
            logoPath: uploadResult.url,
            tenantId: resolvedTenantId,
            updatedBy: currentUserId,
            updatedAt: new Date(),
        };
        const updated = await client_1.default.receiptSetting.update({
            where: { settingId: existing.settingId },
            data: updateData,
        });
        await audit_log_service_1.auditLogService.createAuditLog({
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
exports.ReceiptSettingService = ReceiptSettingService;
//# sourceMappingURL=receipt-settings.service.js.map