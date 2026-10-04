"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.BaseSeeder = void 0;
const client_1 = __importDefault(require("../database/client"));
class BaseSeeder {
    async run() {
        console.log(`🌱 Seeding ${this.name}...`);
        try {
            await this.seed();
            console.log(`✅ ${this.name} seeded successfully\n`);
        }
        catch (error) {
            console.error(`❌ Error seeding ${this.name}:`, error);
            throw error;
        }
    }
    async clearTable(tableName) {
        try {
            await client_1.default.$executeRawUnsafe(`TRUNCATE TABLE ${tableName} RESTART IDENTITY CASCADE`);
        }
        catch (error) {
            console.warn(`⚠️  Could not clear table ${tableName}:`, error);
        }
    }
}
exports.BaseSeeder = BaseSeeder;
//# sourceMappingURL=base-seeder.js.map