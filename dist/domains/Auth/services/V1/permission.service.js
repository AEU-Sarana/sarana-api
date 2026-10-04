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
        // ADMIN has 100% full feature access automatically
        if (role === 'ADMIN') {
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
            return assigned.map((a) => ({
                featureKey: a.featureKey,
                actions: a.actions ? a.actions.split(',') : ['read'],
            }));
        }
        // Default Cashier permissions if custom permissions haven't been configured yet
        return permissions_1.DEFAULT_CASHIER_PERMISSIONS;
    }
    /**
     * Update feature permissions for a user (Admin only)
     */
    async updateUserPermissions(targetUserId, permissionsInput, grantedBy) {
        const targetUser = await client_1.default.user.findUnique({
            where: { userId: targetUserId },
            select: { userId: true, role: true },
        });
        if (!targetUser) {
            throw new Error('User not found');
        }
        if (targetUser.role === 'ADMIN') {
            return permissions_1.SYSTEM_FEATURES.map((f) => ({
                featureKey: f.key,
                actions: ['all', 'read', 'create', 'update', 'delete'],
            }));
        }
        const validKeys = permissions_1.SYSTEM_FEATURES.map((f) => f.key);
        // Normalize input array whether array of strings or array of { featureKey, actions }
        const normalizedItems = [];
        for (const item of permissionsInput) {
            if (typeof item === 'string') {
                if (validKeys.includes(item)) {
                    normalizedItems.push({ featureKey: item, actions: ['all'] });
                }
            }
            else if (item && typeof item === 'object' && item.featureKey) {
                if (validKeys.includes(item.featureKey)) {
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