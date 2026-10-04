"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReceiptSettingsController = void 0;
const receipt_settings_service_1 = require("../../../../domains/Receipt/services/V1/receipt-settings.service");
const logger_1 = require("../../../../shared/utils/logger");
class ReceiptSettingsController {
    static async getSettings(req, res) {
        try {
            const user = req.user;
            const data = await receipt_settings_service_1.ReceiptSettingService.getSettings(user.tenantId);
            res.status(200).json({
                success: true,
                data,
                message: 'Receipt settings retrieved successfully',
            });
        }
        catch (error) {
            logger_1.logger.error('Get receipt settings error', { error: error.message });
            throw error;
        }
    }
    static async updateSettings(req, res) {
        try {
            const user = req.user;
            const data = await receipt_settings_service_1.ReceiptSettingService.updateSettings(req.body, user.userId, user.tenantId);
            res.status(200).json({
                success: true,
                data,
                message: 'Receipt settings updated successfully',
            });
        }
        catch (error) {
            logger_1.logger.error('Update receipt settings error', { error: error.message });
            throw error;
        }
    }
    static async uploadLogo(req, res) {
        try {
            if (!req.file) {
                throw new Error('No file uploaded');
            }
            const user = req.user;
            const data = await receipt_settings_service_1.ReceiptSettingService.uploadLogo(req.file, user.userId, user.tenantId);
            res.status(200).json({
                success: true,
                data,
                message: 'Logo uploaded successfully',
            });
        }
        catch (error) {
            logger_1.logger.error('Upload receipt logo error', { error: error.message });
            throw error;
        }
    }
}
exports.ReceiptSettingsController = ReceiptSettingsController;
//# sourceMappingURL=receipt-settings.controller.js.map