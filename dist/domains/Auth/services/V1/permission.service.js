"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PermissionService = void 0;
const client_1 = __importDefault(require("../../../../database/client"));
const permissions_1 = require("../../../../shared/constants/permissions");
const logger_1 = require("../../../../shared/utils/logger");
class PermissionService {
    /**
     * Get feature permissions for a user
     */
    async getUserPermissions(userId, role) {
        const roleUpper = (role || '').toUpperCase();
        const restrictedFeatures = [
            'users.manage',
            'roles.manage',
            'settings.manage',
            'backup.manage',
            'security.audit_logs',
        ];
        // 1. ADMINISTRATOR has 100% full feature access automatically
        if (roleUpper === 'ADMINISTRATOR' || roleUpper === 'SUPER_ADMIN') {
            return permissions_1.SYSTEM_FEATURES.map((f) => ({
                featureKey: f.key,
                actions: ['all', 'read', 'create', 'update', 'delete'],
            }));
        }
        const assigned = await client_1.default.userPermission.findMany({
            where: { userId },
            select: { featureKey: true, actions: true },
        });
        if (assigned.length > 0) {
            const filtered = roleUpper === 'ADMIN'
                ? assigned.filter((a) => !restrictedFeatures.includes(a.featureKey))
                : assigned;
            return filtered.map((a) => ({
                featureKey: a.featureKey,
                actions: a.actions ? a.actions.split(',') : ['read'],
            }));
        }
        // 2. Fallback to check Role permissions based on role key if user has a custom role
        const roleRecord = await client_1.default.role.findFirst({
            where: {
                key: { equals: roleUpper, mode: 'insensitive' },
            },
            include: {
                role_permissions: true,
            },
        });
        if (roleRecord && roleRecord.role_permissions && roleRecord.role_permissions.length > 0) {
            return roleRecord.role_permissions.map((rp) => ({
                featureKey: rp.featureKey,
                actions: rp.actions ? rp.actions.split(',') : ['read'],
            }));
        }
        // 3. ADMIN has full operational access EXCEPT the 5 restricted permissions
        if (roleUpper === 'ADMIN') {
            return permissions_1.SYSTEM_FEATURES.filter((f) => !restrictedFeatures.includes(f.key)).map((f) => ({
                featureKey: f.key,
                actions: ['all', 'read', 'create', 'update', 'delete'],
            }));
        }
        // Default Cashier permissions if custom permissions haven't been configured yet
        return permissions_1.DEFAULT_CASHIER_PERMISSIONS;
    }
    /**
     * Update feature permissions for a user (Administrator only)
     */
    async updateUserPermissions(targetUserId, permissionsInput, grantedBy) {
        const targetUser = await client_1.default.user.findUnique({
            where: { userId: targetUserId },
            select: { userId: true, role: true },
        });
        if (!targetUser) {
            throw new Error('User not found');
        }
        const targetRoleUpper = (targetUser.role || '').toUpperCase();
        if (targetRoleUpper === 'ADMINISTRATOR' || targetRoleUpper === 'SUPER_ADMIN') {
            throw new Error('Cannot modify permissions for Administrator role');
        }
        const validKeys = permissions_1.SYSTEM_FEATURES.map((f) => f.key);
        const restrictedFeatures = [
            'users.manage',
            'roles.manage',
            'settings.manage',
            'backup.manage',
            'security.audit_logs',
        ];
        // Normalize input array whether array of strings or array of { featureKey, actions }
        const normalizedItems = [];
        for (const item of permissionsInput) {
            if (typeof item === 'string') {
                if (validKeys.includes(item)) {
                    if (targetRoleUpper === 'ADMIN' && restrictedFeatures.includes(item)) {
                        continue; // Skip restricted features for ADMIN
                    }
                    normalizedItems.push({ featureKey: item, actions: ['all'] });
                }
            }
            else if (item && typeof item === 'object' && item.featureKey) {
                if (validKeys.includes(item.featureKey)) {
                    if (targetRoleUpper === 'ADMIN' && restrictedFeatures.includes(item.featureKey)) {
                        continue; // Skip restricted features for ADMIN
                    }
                    const actionsArr = Array.isArray(item.actions) && item.actions.length > 0 ? item.actions : ['read'];
                    normalizedItems.push({
                        featureKey: item.featureKey,
                        actions: actionsArr,
                    });
                }
            }
        }
        await client_1.default.$transaction(async (tx) => {
            // Remove current permissions
            await tx.userPermission.deleteMany({
                where: { userId: targetUserId },
            });
            // Insert new granted feature permissions with actions
            if (normalizedItems.length > 0) {
                await tx.userPermission.createMany({
                    data: normalizedItems.map((item) => ({
                        userId: targetUserId,
                        featureKey: item.featureKey,
                        actions: item.actions.join(','),
                        grantedBy,
                    })),
                });
            }
        });
        logger_1.logger.info('User permissions updated', {
            targetUserId,
            grantedBy,
            count: normalizedItems.length,
        });
        return normalizedItems;
    }
}
exports.PermissionService = PermissionService;
//# sourceMappingURL=permission.service.js.map