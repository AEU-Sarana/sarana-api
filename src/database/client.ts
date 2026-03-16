import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
// Explicit file import avoids directory resolution issues in Node16/tsx.
import { PrismaClient } from './generated/index.js';
import { logger } from '@src/shared/utils/logger';

// Create a single pool instance (reused across requests)
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// Create the adapter
const adapter = new PrismaPg(pool);

// Slow query logging (default 200ms, configurable via env)
const slowQueryThresholdMs = Number(process.env.SLOW_QUERY_MS || 200);


// Create Prisma Client instance with query extension (Prisma 7+)
const prisma = new PrismaClient({ adapter }).$extends({
  query: {
    async $allOperations({ model, operation, args, query }: {
      model?: string;
      operation: string;
      args: any;
      query: (args: any) => any;
    }) {
      const start = Date.now();
      const result = await query(args);
      const duration = Date.now() - start;
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
const closePool = async () => {
  await prisma.$disconnect();
  try {
    await pool.end();
  } catch (error: any) {
    if (!error.message?.includes('Called end on pool more than once')) {
      throw error;
    }
  }
};

process.on('beforeExit', closePool);

export { closePool as closeDatabase };

export default prisma;
