import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import { PrismaClient } from '@prisma/client';
import { logger } from '@src/shared/utils/logger';

// Create a single pool instance (reused across requests)
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// Create the adapter
const adapter = new PrismaPg(pool);

// Create Prisma Client instance
const prisma = new PrismaClient({ adapter }).$extends({
  query: {
    $allOperations: async ({ model, operation, args, query }) => {
      const start = Date.now();
      const result = await query(args);
      const duration = Date.now() - start;

      // Slow query logging (default 200ms, configurable via env)
      const slowQueryThresholdMs = Number(process.env.SLOW_QUERY_MS || 200);
      if (duration >= slowQueryThresholdMs) {
        logger.warn('Slow database query detected', {
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
process.on('beforeExit', async () => {
  await prisma.$disconnect();
  await pool.end();
});

export default prisma;
