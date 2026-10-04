"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.prisma = void 0;
exports.connectDatabase = connectDatabase;
exports.disconnectDatabase = disconnectDatabase;
const client_1 = __importDefault(require("../../database/client"));
const logger_1 = require("../../shared/utils/logger");
// Re-export the existing Prisma Client instance
exports.prisma = client_1.default;
// Database connection helper
async function connectDatabase() {
    try {
        await exports.prisma.$connect();
        logger_1.logger.info('✅ Database connected successfully');
    }
    catch (error) {
        logger_1.logger.error('❌ Database connection failed:', error);
        process.exit(1);
    }
}
// Database disconnection helper
async function disconnectDatabase() {
    await exports.prisma.$disconnect();
    logger_1.logger.info('Database disconnected');
}
// Graceful shutdown
process.on('beforeExit', async () => {
    await disconnectDatabase();
});
//# sourceMappingURL=database.js.map