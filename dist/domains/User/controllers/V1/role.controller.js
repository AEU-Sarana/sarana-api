"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RoleController = void 0;
const role_service_1 = require("../../services/role.service");
function parseIdParam(param) {
    const str = Array.isArray(param) ? param[0] : param;
    return parseInt(str, 10);
}
class RoleController {
    /**
     * List all roles
     */
    static async listRoles(req, res, next) {
        try {
            const roles = await role_service_1.RoleService.listRoles();
            res.status(200).json({
                success: true,
                data: roles,
            });
        }
        catch (error) {
            next(error);
        }
    }
    /**
     * Get role details
     */
    static async getRole(req, res, next) {
        try {
            const roleId = parseIdParam(req.params.id);
            const role = await role_service_1.RoleService.getRole(roleId);
            res.status(200).json({
                success: true,
                data: role,
            });
        }
        catch (error) {
            next(error);
        }
    }
    /**
     * Create custom role
     */
    static async createRole(req, res, next) {
        try {
            const currentUserId = req.user.userId;
            const role = await role_service_1.RoleService.createRole(req.body, currentUserId);
            res.status(201).json({
                success: true,
                message: 'Role created successfully',
                data: role,
            });
        }
        catch (error) {
            next(error);
        }
    }
    /**
     * Update custom role
     */
    static async updateRole(req, res, next) {
        try {
            const roleId = parseIdParam(req.params.id);
            const currentUserId = req.user.userId;
            const role = await role_service_1.RoleService.updateRole(roleId, req.body, currentUserId);
            res.status(200).json({
                success: true,
                message: 'Role updated successfully',
                data: role,
            });
        }
        catch (error) {
            next(error);
        }
    }
    /**
     * Delete custom role
     */
    static async deleteRole(req, res, next) {
        try {
            const roleId = parseIdParam(req.params.id);
            const currentUserId = req.user.userId;
            await role_service_1.RoleService.deleteRole(roleId, currentUserId);
            res.status(200).json({
                success: true,
                message: 'Role deleted successfully',
            });
        }
        catch (error) {
            next(error);
        }
    }
}
exports.RoleController = RoleController;
//# sourceMappingURL=role.controller.js.map