"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_middleware_1 = require("../../../../shared/middleware/auth.middleware");
const authorization_middleware_1 = require("../../../../shared/middleware/authorization.middleware");
const validation_middleware_1 = require("../../../../shared/middleware/validation.middleware");
const permissions_1 = require("../../../../shared/config/permissions");
const settings_controller_1 = require("../../../../domains/Setting/controllers/V1/settings.controller");
const V1_1 = require("../../../../domains/Setting/validators/V1");
const router = (0, express_1.Router)();
// All routes require authentication
router.use(auth_middleware_1.authenticateToken);
// Get settings - Admin only
router.get('/', authorization_middleware_1.requireAdmin, (0, authorization_middleware_1.requirePermission)(permissions_1.Permission.SETTINGS_VIEW), settings_controller_1.SettingsController.getSettings);
// Update settings - Admin only
router.put('/', authorization_middleware_1.requireAdmin, (0, authorization_middleware_1.requirePermission)(permissions_1.Permission.SETTINGS_UPDATE), ...(0, validation_middleware_1.validateRequest)(V1_1.updateSettingsValidator), settings_controller_1.SettingsController.updateSettings);
exports.default = router;
//# sourceMappingURL=settings.routes.js.map