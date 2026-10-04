"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.closeDatabase = void 0;
require("dotenv/config");
const adapter_pg_1 = require("@prisma/adapter-pg");
const pg_1 = require("pg");
// Explicit file import avoids directory resolution issues in Node16/tsx.
const index_js_1 = require("./generated/index.js");
const logger_1 = require("../shared/utils/logger");
const neonFallbackUrl = 'postgresql://neondb_owner:npg_OhqXfG59lLMR@ep-cool-block-b5hbfurd-pooler.c-7.us-east-2.aws.neon.tech/neondb?sslmode=require';
const pool = new pg_1.Pool({ connectionString: process.env.DATABASE_URL || neonFallbackUrl });
// Create the adapter
const adapter = new adapter_pg_1.PrismaPg(pool);
// Slow query logging (default 200ms, configurable via env)
const slowQueryThresholdMs = Number(process.env.SLOW_QUERY_MS || 200);
// Create Prisma Client instance with query extension (Prisma 7+)
const prisma = new index_js_1.PrismaClient({ adapter }).$extends({
    query: {
        async $allOperations({ model, operation, args, query }) {
            const start = Date.now();
            const result = await query(args);
            const duration = Date.now() - start;
            if (duration >= slowQueryThresholdMs) {
                logger_1.logger.warn('Slow database query detected', {
                    model,
                    action: operation,
                    duration_ms: duration,
                });
            }
            return result;
        },
    },
});
// Graceful shutdown
const closePool = async () => {
    await prisma.$disconnect();
    try {
        await pool.end();
    }
    catch (error) {
        if (!error.message?.includes('Called end on pool more than once')) {
            throw error;
        }
    }
};
exports.closeDatabase = closePool;
process.on('beforeExit', closePool);
exports.default = prisma;
//# sourceMappingURL=client.js.map