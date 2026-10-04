"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DashboardController = void 0;
const dashboard_service_1 = require("../../../../domains/Dashbord/services/dashboard.service");
const logger_1 = require("../../../../shared/utils/logger");
class DashboardController {
    /**
     * GET /api/v1/dashboard/overview
     */
    static async getOverview(req, res) {
        try {
            const user = req.user;
            const response = await dashboard_service_1.DashboardService.getOverview(user.userId, user.role);
            res.status(200).json({
                success: true,
                data: response,
                message: 'Dashboard overview retrieved successfully',
            });
        }
        catch (error) {
            logger_1.logger.error('Get dashboard overview error', { error: error.message });
            throw error;
        }
    }
    /**
     * GET /api/v1/dashboard/top-products
     */
    static async getTopProducts(req, res) {
        try {
            const limit = Number(req.query.limit) || 5;
            const sortBy = req.query.sortBy || 'quantity';
            const topProducts = await dashboard_service_1.DashboardService.getTopProducts(limit, sortBy);
            res.status(200).json({
                success: true,
                data: topProducts,
                message: 'Top selling products retrieved successfully',
            });
        }
        catch (error) {
            logger_1.logger.error('Get top products error', { error: error.message });
            throw error;
        }
    }
}
exports.DashboardController = DashboardController;
//# sourceMappingURL=dashboard.controller.js.map