"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserSeeder = void 0;
const base_seeder_1 = require("../../base-seeder");
const client_1 = __importDefault(require("../../../database/client"));
const user_seed_data_1 = require("./user-seed-data");
const permissions_1 = require("../../../shared/constants/permissions");
class UserSeeder extends base_seeder_1.BaseSeeder {
    constructor() {
        super(...arguments);
        this.name = 'Users';
    }
    async seed() {
        // 1. Ensure system roles exist in roles table
        const systemRoles = [
            {
                key: 'ADMINISTRATOR',
                name: 'System Administrator',
                description: 'Full system administration: users, roles, settings, backups & audit logs',
                isSystem: true,
            },
            {
                key: 'ADMIN',
                name: 'Store Admin',
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
        for (const sr of systemRoles) {
            await client_1.default.role.upsert({
                where: { key: sr.key },
                update: {
                    name: sr.name,
                    description: sr.description,
                    isSystem: true,
                },
                create: {
                    key: sr.key,
                    name: sr.name,
                    description: sr.description,
                    isSystem: true,
                },
            });
        }
        const usersByUsername = new Map();
        for (const userData of user_seed_data_1.userSeedData) {
            const user = await client_1.default.user.upsert({
                where: { username: userData.username },
                update: {
                    email: userData.email,
                    passwordHash: userData.passwordHash,
                    pinHash: userData.pinHash,
                    fullName: userData.fullName,
                    role: userData.role,
                    phone: userData.phone,
                    status: userData.status,
                    deviceId: userData.deviceId,
                },
                create: {
                    username: userData.username,
                    email: userData.email,
                    passwordHash: userData.passwordHash,
                    pinHash: userData.pinHash,
                    fullName: userData.fullName,
                    role: userData.role,
                    phone: userData.phone,
                    status: userData.status,
                    deviceId: userData.deviceId,
                },
                select: {
                    userId: true,
                    role: true,
                },
            });
            usersByUsername.set(userData.username, {
                userId: user.userId,
                role: user.role,
                tenantId: userData.tenantId,
            });
        }
        const adminIdByTenant = new Map();
        for (const user of usersByUsername.values()) {
            if ((user.role === 'ADMIN' || user.role === 'ADMINISTRATOR') && !adminIdByTenant.has(user.tenantId)) {
                adminIdByTenant.set(user.tenantId, user.userId);
            }
        }
        for (const userData of user_seed_data_1.userSeedData) {
            const seededUser = usersByUsername.get(userData.username);
            if (!seededUser) {
                continue;
            }
            let createdBy;
            if (userData.createdByUsername) {
                const creator = usersByUsername.get(userData.createdByUsername);
                if (!creator) {
                    throw new Error(`Invalid createdByUsername "${userData.createdByUsername}" for user "${userData.username}"`);
                }
                createdBy = creator.userId;
            }
            else if (seededUser.role === 'ADMIN' || seededUser.role === 'ADMINISTRATOR') {
                createdBy = seededUser.userId;
            }
            else {
                createdBy = adminIdByTenant.get(userData.tenantId);
            }
            if (createdBy) {
                await client_1.default.user.update({
                    where: { userId: seededUser.userId },
                    data: { createdBy },
                });
            }
        }
        // Seed default permissions for CASHIER users if none assigned
        const adminUser = Array.from(usersByUsername.values()).find((u) => u.role === 'ADMINISTRATOR' || u.role === 'ADMIN');
        const adminId = adminUser ? adminUser.userId : 1;
        for (const user of usersByUsername.values()) {
            if (user.role === 'CASHIER') {
                const existingCount = await client_1.default.userPermission.count({
                    where: { userId: user.userId },
                });
                if (existingCount === 0) {
                    for (const perm of permissions_1.DEFAULT_CASHIER_PERMISSIONS) {
                        await client_1.default.userPermission.create({
                            data: {
                                userId: user.userId,
                                featureKey: perm.featureKey,
                                actions: perm.actions.join(','),
                                grantedBy: adminId,
                            },
                        });
                    }
                }
            }
        }
        console.log(`   Created/Updated ${user_seed_data_1.userSeedData.length} users with default permissions`);
    }
}
exports.UserSeeder = UserSeeder;
//# sourceMappingURL=user.seeder.js.map