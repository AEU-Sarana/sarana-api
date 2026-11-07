"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RoleService = exports.ADMIN_RESTRICTED_FEATURES = void 0;
const client_1 = __importDefault(require("../../../database/client"));
const exceptions_1 = require("../../../shared/exceptions");
const audit_log_service_1 = require("../../../shared/services/audit-log.service");
const logger_1 = require("../../../shared/utils/logger");
const permissions_1 = require("../../../shared/constants/permissions");
exports.ADMIN_RESTRICTED_FEATURES = new Set([
    'users.manage',
    'roles.manage',
    'settings.manage',
    'backup.manage',
    'security.audit_logs',
]);
class RoleService {
    /**
     * List all roles with permission details and user count
     */
    static async listRoles() {
        // Ensure default system roles exist
        const systemRoles = [
            {
                key: 'ADMINISTRATOR',
                name: 'Administrator',
                description: 'Full system administration: users, roles, settings, backups & audit logs',
                isSystem: true,
            },
            {
                key: 'ADMIN',
                name: 'Admin (Store Manager)',
                description: 'Store operations: products, stock, purchasing, sales, reports & customers',
                isSystem: true,
            },
            {
                key: 'CASHIER',
                name: 'Cashier',
                description: 'POS sales checkout, receipt printing & limited catalog view',
                isSystem: true,
            },
        ];
        try {
            for (const sr of systemRoles) {
                const roleRecord = await client_1.default.role.upsert({
                    where: { key: sr.key },
                    update: { isSystem: true, name: sr.name, description: sr.description },
                    create: {
                        key: sr.key,
                        name: sr.name,
                        description: sr.description,
                        isSystem: true,
                    },
                    include: { role_permissions: true },
                });
                if (sr.key === 'ADMINISTRATOR') {
                    // Administrator MUST have all 21 system features
                    const existingKeys = new Set((roleRecord.role_permissions || []).map((p) => p.featureKey));
                    const missingFeatures = permissions_1.SYSTEM_FEATURES.filter((f) => !existingKeys.has(f.key));
                    if (missingFeatures.length > 0) {
                        await client_1.default.rolePermission.createMany({
                            data: missingFeatures.map((f) => ({
                                roleId: roleRecord.roleId,
                                featureKey: f.key,
                                actions: f.supportedActions.join(','),
                            })),
                        });
                    }
                }
                else if (sr.key === 'ADMIN') {
                    // Store Admin MUST NOT have any restricted administrative permissions:
                    // User management, Role & Permission, App Setting, Backup, Audit Log
                    await client_1.default.rolePermission.deleteMany({
                        where: {
                            roleId: roleRecord.roleId,
                            featureKey: {
                                in: Array.from(exports.ADMIN_RESTRICTED_FEATURES),
                            },
                        },
                    });
                    // Ensure Store Admin has all operational store features
                    const currentPermissions = await client_1.default.rolePermission.findMany({
                        where: { roleId: roleRecord.roleId },
                    });
                    const existingKeys = new Set(currentPermissions.map((p) => p.featureKey));
                    const operationalFeatures = permissions_1.SYSTEM_FEATURES.filter((f) => !exports.ADMIN_RESTRICTED_FEATURES.has(f.key) && !existingKeys.has(f.key));
                    if (operationalFeatures.length > 0) {
                        await client_1.default.rolePermission.createMany({
                            data: operationalFeatures.map((f) => ({
                                roleId: roleRecord.roleId,
                                featureKey: f.key,
                                actions: f.supportedActions.join(','),
                            })),
                        });
                    }
                }
                else if (sr.key === 'CASHIER') {
                    if (!roleRecord.role_permissions || roleRecord.role_permissions.length === 0) {
                        const cashierFeatures = permissions_1.SYSTEM_FEATURES.filter((f) => f.defaultCashier);
                        await client_1.default.rolePermission.createMany({
                            data: cashierFeatures.map((f) => ({
                                roleId: roleRecord.roleId,
                                featureKey: f.key,
                                actions: 'read,create,update',
                            })),
                        });
                    }
                }
            }
        }
        catch (e) {
            // Ignore if concurrent seed or DB lock
        }
        const roles = await client_1.default.role.findMany({
            include: {
                role_permissions: true,
            },
            orderBy: { roleId: 'asc' },
        });
        // Get user count per role key
        const userCounts = await client_1.default.user.groupBy({
            by: ['role'],
            _count: { userId: true },
        });
        const userCountMap = new Map();
        for (const uc of userCounts) {
            if (uc.role) {
                userCountMap.set(uc.role.toUpperCase(), uc._count.userId);
            }
        }
        return roles.map((role) => ({
            role_id: role.roleId,
            key: role.key,
            name: role.name,
            description: role.description,
            is_system: role.isSystem,
            user_count: userCountMap.get(role.key.toUpperCase()) || 0,
            permissions: (role.role_permissions || []).map((p) => ({
                feature_key: p.featureKey,
                actions: p.actions ? p.actions.split(',') : ['read'],
            })),
            created_at: role.createdAt,
            updated_at: role.updatedAt,
        }));
    }
    /**
     * Get role details by ID
     */
    static async getRole(roleId) {
        const role = await client_1.default.role.findUnique({
            where: { roleId: roleId },
            include: {
                role_permissions: true,
            },
        });
        if (!role) {
            throw new exceptions_1.ValidationException('Role not found');
        }
        const userCount = await client_1.default.user.count({
            where: { role: role.key },
        });
        return {
            role_id: role.roleId,
            key: role.key,
            name: role.name,
            description: role.description,
            is_system: role.isSystem,
            user_count: userCount,
            permissions: (role.role_permissions || []).map((p) => ({
                feature_key: p.featureKey,
                actions: p.actions ? p.actions.split(',') : ['read'],
            })),
            created_at: role.createdAt,
            updated_at: role.updatedAt,
        };
    }
    /**
     * Create a new custom role
     */
    static async createRole(request, currentUserId) {
        const { key: rawKey, name, description, permissions } = request;
        const key = rawKey.trim().toUpperCase().replace(/\s+/g, '_');
        if (!key || !name) {
            throw new exceptions_1.ValidationException('Role key and name are required');
        }
        // Check if key already exists
        const existing = await client_1.default.role.findFirst({
            where: { key: { equals: key, mode: 'insensitive' } },
        });
        if (existing) {
            throw new exceptions_1.ValidationException(`Role key '${key}' already exists`);
        }
        // Create role with permissions in transaction
        const newRole = await client_1.default.$transaction(async (tx) => {
            const createdRole = await tx.role.create({
                data: {
                    key,
                    name,
                    description,
                    isSystem: false,
                },
            });
            if (permissions && permissions.length > 0) {
                await tx.rolePermission.createMany({
                    data: permissions.map((p) => ({
                        roleId: createdRole.roleId,
                        featureKey: p.feature_key,
                        actions: Array.isArray(p.actions) ? p.actions.join(',') : p.actions || 'read',
                    })),
                });
            }
            return tx.role.findUnique({
                where: { roleId: createdRole.roleId },
                include: { role_permissions: true },
            });
        });
        if (!newRole) {
            throw new exceptions_1.BusinessLogicException('Failed to create role');
        }
        await audit_log_service_1.auditLogService.createAuditLog({
            userId: currentUserId,
            action: 'CREATE_ROLE',
            entityType: 'Role',
            entityId: newRole.roleId,
            newValues: { key, name, permissions },
        });
        logger_1.logger.info('Custom role created', { roleId: newRole.roleId, key, createdBy: currentUserId });
        return {
            role_id: newRole.roleId,
            key: newRole.key,
            name: newRole.name,
            description: newRole.description,
            is_system: newRole.isSystem,
            user_count: 0,
            permissions: (newRole.role_permissions || []).map((p) => ({
                feature_key: p.featureKey,
                actions: p.actions ? p.actions.split(',') : ['read'],
            })),
            created_at: newRole.createdAt,
            updated_at: newRole.updatedAt,
        };
    }
    /**
     * Update custom role details and permission matrix
     */
    static async updateRole(roleId, request, currentUserId) {
        const existingRole = await client_1.default.role.findUnique({
            where: { roleId: roleId },
            include: { role_permissions: true },
        });
        if (!existingRole) {
            throw new exceptions_1.ValidationException('Role not found');
        }
        let { name, description, permissions } = request;
        // Strictly forbid assigning administrative features to Store Admin role (ADMIN)
        if (existingRole.key === 'ADMIN' && permissions !== undefined) {
            permissions = permissions.filter((p) => !exports.ADMIN_RESTRICTED_FEATURES.has(p.feature_key));
        }
        const updatedRole = await client_1.default.$transaction(async (tx) => {
            await tx.role.update({
                where: { roleId: roleId },
                data: {
                    ...(name ? { name } : {}),
                    ...(description !== undefined ? { description } : {}),
                    updatedAt: new Date(),
                },
            });
            if (permissions !== undefined) {
                // Clear existing permissions for role
                await tx.rolePermission.deleteMany({
                    where: { roleId: roleId },
                });
                // Insert new permissions
                if (permissions.length > 0) {
                    await tx.rolePermission.createMany({
                        data: permissions.map((p) => ({
                            roleId: roleId,
                            featureKey: p.feature_key,
                            actions: Array.isArray(p.actions) ? p.actions.join(',') : p.actions || 'read',
                        })),
                    });
                }
            }
            return tx.role.findUnique({
                where: { roleId: roleId },
                include: { role_permissions: true },
            });
        });
        if (!updatedRole) {
            throw new exceptions_1.BusinessLogicException('Failed to update role');
        }
        const userCount = await client_1.default.user.count({
            where: { role: updatedRole.key },
        });
        await audit_log_service_1.auditLogService.createAuditLog({
            userId: currentUserId,
            action: 'UPDATE_ROLE',
            entityType: 'Role',
            entityId: roleId,
            newValues: { name, description, permissions },
        });
        logger_1.logger.info('Role updated', { roleId, key: updatedRole.key, updatedBy: currentUserId });
        return {
            role_id: updatedRole.roleId,
            key: updatedRole.key,
            name: updatedRole.name,
            description: updatedRole.description,
            is_system: updatedRole.isSystem,
            user_count: userCount,
            permissions: (updatedRole.role_permissions || []).map((p) => ({
                feature_key: p.featureKey,
                actions: p.actions ? p.actions.split(',') : ['read'],
            })),
            created_at: updatedRole.createdAt,
            updated_at: updatedRole.updatedAt,
        };
    }
    /**
     * Delete custom role
     */
    static async deleteRole(roleId, currentUserId) {
        const existingRole = await client_1.default.role.findUnique({
            where: { roleId: roleId },
        });
        if (!existingRole) {
            throw new exceptions_1.ValidationException('Role not found');
        }
        if (existingRole.isSystem) {
            throw new exceptions_1.BusinessLogicException('System roles (ADMIN/CASHIER) cannot be deleted');
        }
        // Check if any users are assigned to this role
        const assignedUserCount = await client_1.default.user.count({
            where: { role: existingRole.key },
        });
        if (assignedUserCount > 0) {
            throw new exceptions_1.BusinessLogicException(`Cannot delete role '${existingRole.name}' because ${assignedUserCount} user(s) are assigned to it.`);
        }
        await client_1.default.role.delete({
            where: { roleId: roleId },
        });
        await audit_log_service_1.auditLogService.createAuditLog({
            userId: currentUserId,
            action: 'DELETE_ROLE',
            entityType: 'Role',
            entityId: roleId,
            oldValues: { key: existingRole.key, name: existingRole.name },
        });
        logger_1.logger.info('Role deleted', { roleId, key: existingRole.key, deletedBy: currentUserId });
    }
}
exports.RoleService = RoleService;
//# sourceMappingURL=role.service.js.map