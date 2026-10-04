"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_middleware_1 = require("../../../../shared/middleware/auth.middleware");
const validation_middleware_1 = require("../../../../shared/middleware/validation.middleware");
const index_1 = require("../../validators/V1/index");
const report_controller_1 = require("../../controllers/V1/report.controller");
const router = (0, express_1.Router)();
router.use(auth_middleware_1.authenticateToken);
/**
 * GET /api/v1/reports/daily
 */
router.get('/daily', (0, auth_middleware_1.requirePermission)('reports.daily_shift', 'read'), ...(0, validation_middleware_1.validateRequest)(index_1.getDailyReportValidator), report_controller_1.ReportController.getDailyReport);
/**
 * GET /api/v1/reports/sales
 */
router.get('/sales', (0, auth_middleware_1.requirePermission)('reports.full_analytics', 'read'), ...(0, validation_middleware_1.validateRequest)(index_1.getSalesHistoryReportValidator), report_controller_1.ReportController.getSalesHistoryReport);
/**
 * GET /api/v1/reports/stock
 */
router.get('/stock', (0, auth_middleware_1.requirePermission)('reports.full_analytics', 'read'), ...(0, validation_middleware_1.validateRequest)(index_1.getStockReportValidator), report_controller_1.ReportController.getStockReport);
/**
 * GET /api/v1/reports/income
 */
router.get('/income', (0, auth_middleware_1.requirePermission)('reports.full_analytics', 'read'), ...(0, validation_middleware_1.validateRequest)(index_1.getIncomeReportValidator), report_controller_1.ReportController.getIncomeReport);
/**
 * POST /api/v1/reports/export
 */
router.post('/export', (0, auth_middleware_1.requirePermission)('reports.full_analytics', 'create'), ...(0, validation_middleware_1.validateRequest)(index_1.exportReportValidator), report_controller_1.ReportController.exportReport);
exports.default = router;
//# sourceMappingURL=report.routes.js.map