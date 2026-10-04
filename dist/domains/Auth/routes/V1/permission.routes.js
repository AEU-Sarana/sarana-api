"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const permission_controller_1 = require("../../controllers/V1/permission.controller");
const auth_middleware_1 = require("../../../../shared/middleware/auth.middleware");
const router = (0, express_1.Router)();
// GET /api/v1/permissions/features — Master features list
router.get('/permissions/features', auth_middleware_1.authenticateToken, permission_controller_1.PermissionController.getSystemFeatures);
// GET /api/v1/users/:id/permissions — Get user's permissions
router.get('/users/:id/permissions', auth_middleware_1.authenticateToken, auth_middleware_1.requireAdmin, permission_controller_1.PermissionController.getUserPermissions);
// PUT /api/v1/users/:id/permissions — Update user's permissions
router.put('/users/:id/permissions', auth_middleware_1.authenticateToken, auth_middleware_1.requireAdmin, permission_controller_1.PermissionController.updateUserPermissions);
exports.default = router;
//# sourceMappingURL=permission.routes.js.map