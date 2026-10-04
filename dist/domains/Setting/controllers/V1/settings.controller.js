"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SettingsController = void 0;
const setting_service_1 = require("../../../../domains/Setting/services/setting.service");
const logger_1 = require("../../../../shared/utils/logger");
class SettingsController {
    /**
     * GET /api/v1/settings
     * Get application settings
     */
    static async getSettings(req, res) {
        try {
            const user = req.user;
            const response = await setting_service_1.SettingService.getSettings(user.userId);
            res.status(200).json({
                success: true,
                data: response,
                message: 'Settings retrieved successfully',
            });
        }
        catch (error) {
            logger_1.logger.error('Get settings error', { error: error.message });
            throw error;
        }
    }
    /**
     * PUT /api/v1/settings
     * Update application settings
     */
    static async updateSettings(req, res) {
        try {
            const user = req.user;
            const request = req.body;
            const response = await setting_service_1.SettingService.updateSettings(request, user.userId);
            res.status(200).json({
                success: true,
                data: response,
                message: 'Settings updated successfully',
            });
        }
        catch (error) {
            logger_1.logger.error('Update settings error', { error: error.message });
            throw error;
        }
    }
}
exports.SettingsController = SettingsController;
//# sourceMappingURL=settings.controller.js.map