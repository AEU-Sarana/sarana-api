"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuditLogSeeder = void 0;
const base_seeder_1 = require("../../base-seeder");
const client_1 = __importDefault(require("../../../database/client"));
const seeder_helper_1 = require("../utils/seeder-helper");
class AuditLogSeeder extends base_seeder_1.BaseSeeder {
    constructor() {
        super(...arguments);
        this.name = 'Audit Logs';
    }
    async seed() {
        const users = await client_1.default.user.findMany({
            select: { userId: true },
        });
        if (users.length === 0) {
            console.log('   ⚠️  No users found. Skipping audit log seeding.');
            return;
        }
        const actions = [
            'CREATE_USER',
            'UPDATE_USER',
            'DELETE_USER',
            'CREATE_PRODUCT',
            'UPDATE_PRODUCT',
            'DELETE_PRODUCT',
            'CREATE_ORDER',
            'UPDATE_ORDER',
            'STOCK_IN',
            'STOCK_OUT',
            'ADJUST_STOCK',
        ];
        const entityTypes = ['User', 'Product', 'Order', 'Stock'];
        const ipAddresses = ['192.168.1.1', '192.168.1.2', '10.0.0.1', '127.0.0.1'];
        const userAgents = [
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
            'Mozilla/5.0 (X11; Linux x86_64)',
        ];
        const logs = [];
        // Create audit logs for the last 90 days
        for (let i = 0; i < 200; i++) {
            const userId = seeder_helper_1.SeederHelper.randomElement(users).userId;
            const action = seeder_helper_1.SeederHelper.randomElement(actions);
            const entityType = seeder_helper_1.SeederHelper.randomElement(entityTypes);
            const entityId = seeder_helper_1.SeederHelper.randomInt(1, 100);
            const createdAt = seeder_helper_1.SeederHelper.randomDate(new Date(Date.now() - 90 * 24 * 60 * 60 * 1000), // 90 days ago
            new Date());
            const log = await client_1.default.auditLog.create({
                data: {
                    userId: Math.random() > 0.1 ? userId : null, // 90% have user
                    action,
                    entityType,
                    entityId,
                    oldValues: Math.random() > 0.5 ? { oldValue: 'previous' } : undefined,
                    newValues: { newValue: 'current' },
                    ipAddress: seeder_helper_1.SeederHelper.randomElement(ipAddresses),
                    userAgent: seeder_helper_1.SeederHelper.randomElement(userAgents),
                    createdAt,
                },
            });
            logs.push(log);
        }
        console.log(`   Created ${logs.length} audit logs`);
    }
}
exports.AuditLogSeeder = AuditLogSeeder;
//# sourceMappingURL=audit-log.seeder.js.map