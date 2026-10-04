"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_middleware_1 = require("../../../../shared/middleware/auth.middleware");
const role_controller_1 = require("../../controllers/V1/role.controller");
const router = (0, express_1.Router)();
// All role routes require authentication
router.use(auth_middleware_1.authenticateToken);
// List roles
router.get('/', (0, auth_middleware_1.requirePermission)('users.manage', 'read'), role_controller_1.RoleController.listRoles);
// Get role details
router.get('/:id', (0, auth_middleware_1.requirePermission)('users.manage', 'read'), role_controller_1.RoleController.getRole);
// Create custom role
router.post('/', (0, auth_middleware_1.requirePermission)('users.manage', 'create'), role_controller_1.RoleController.createRole);
// Update custom role
router.put('/:id', (0, auth_middleware_1.requirePermission)('users.manage', 'update'), role_controller_1.RoleController.updateRole);
// Delete custom role
router.delete('/:id', (0, auth_middleware_1.requirePermission)('users.manage', 'delete'), role_controller_1.RoleController.deleteRole);
exports.default = router;
//# sourceMappingURL=role.routes.js.map