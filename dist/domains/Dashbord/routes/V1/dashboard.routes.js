"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_middleware_1 = require("../../../../shared/middleware/auth.middleware");
const dashboard_controller_1 = require("../../../../domains/Dashbord/controllers/V1/dashboard.controller");
const router = (0, express_1.Router)();
// All routes require authentication
router.use(auth_middleware_1.authenticateToken);
// Dashboard overview - Admin or Seller/Staff
router.get('/overview', dashboard_controller_1.DashboardController.getOverview);
// Top selling products of the month
router.get('/top-products', dashboard_controller_1.DashboardController.getTopProducts);
exports.default = router;
//# sourceMappingURL=dashboard.routes.js.map