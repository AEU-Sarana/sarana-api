"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.userSeedData = void 0;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
exports.userSeedData = [
    {
        username: 'admin',
        email: 'admin@gmail.com',
        passwordHash: bcryptjs_1.default.hashSync('Admin123!', 10),
        fullName: 'System Administrator',
        role: 'ADMIN',
        phone: '012345678',
        status: 'active',
        tenantId: 1,
    },
    {
        username: 'cashier1',
        email: 'cashier1@gmail.com',
        passwordHash: bcryptjs_1.default.hashSync('Cashier123!', 10),
        fullName: 'Cashier One',
        role: 'CASHIER',
        phone: '012345679',
        status: 'active',
        tenantId: 1,
        createdByUsername: 'admin',
    },
    {
        username: 'cashier2',
        email: 'cashier2@gmail.com',
        passwordHash: bcryptjs_1.default.hashSync('Cashier123!', 10),
        fullName: 'Cashier Two',
        role: 'CASHIER',
        phone: '012345680',
        status: 'active',
        tenantId: 1,
        createdByUsername: 'admin',
    },
];
//# sourceMappingURL=user-seed-data.js.map