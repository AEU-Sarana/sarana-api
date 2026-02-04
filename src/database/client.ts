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
const prisma = new PrismaClient({ adapter });

// Slow query logging (default 200ms, configurable via env)
const slowQueryThresholdMs = Number(process.env.SLOW_QUERY_MS || 200);
prisma.$use(async (params, next) => {
  const start = Date.now();
  const result = await next(params);
  const duration = Date.now() - start;

  if (duration >= slowQueryThresholdMs) {
    logger.warn('Slow database query detected', {
      model: params.model,
      action: params.action,
      duration_ms: duration,
    });
  }

  return result;
});

// Graceful shutdown
process.on('beforeExit', async () => {
  await prisma.$disconnect();
  await pool.end();
});

export default prisma;
