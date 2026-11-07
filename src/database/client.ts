import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
// Explicit file import avoids directory resolution issues in Node16/tsx.
import { PrismaClient } from './generated/index.js';
import { logger } from '@src/shared/utils/logger';

const neonFallbackUrl = 'postgresql://neondb_owner:npg_OhqXfG59lLMR@ep-cool-block-b5hbfurd-pooler.c-7.us-east-2.aws.neon.tech/neondb?sslmode=require';
const pool = new Pool({ connectionString: process.env.DATABASE_URL || neonFallbackUrl });

// Ensure schema consistency for customer_payments, supplier_payments, and receipt_settings
pool.query(`
  ALTER TABLE IF EXISTS "customer_payments" ADD COLUMN IF NOT EXISTS "attachment_url" TEXT;
  ALTER TABLE IF EXISTS "customer_payments" ADD COLUMN IF NOT EXISTS "reference_number" VARCHAR(100);
  ALTER TABLE IF EXISTS "supplier_payments" ADD COLUMN IF NOT EXISTS "attachment_url" TEXT;
  ALTER TABLE IF EXISTS "supplier_payments" ADD COLUMN IF NOT EXISTS "reference_number" VARCHAR(100);
  ALTER TABLE IF EXISTS "receipt_settings" ADD COLUMN IF NOT EXISTS "exchange_rate" DECIMAL(10, 2) NOT NULL DEFAULT 4000.00;
`).then(() => {
  logger.info('✅ Ensured customer_payments, supplier_payments & receipt_settings table columns');
}).catch((err) => {
  logger.warn('Failed to ensure database columns:', err.message);
});

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

if (!process.env.VERCEL) {
  process.once('SIGINT', closePool);
  process.once('SIGTERM', closePool);
}

export { closePool as closeDatabase };

export default prisma;
