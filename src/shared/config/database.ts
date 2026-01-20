import prismaInstance from '@src/database/client';
import { logger } from '@src/shared/utils/logger';

// Re-export the existing Prisma Client instance
export const prisma = prismaInstance;

// Database connection helper
export async function connectDatabase(): Promise<void> {
  try {
    await prisma.$connect();
    logger.info('✅ Database connected successfully');
  } catch (error) {
    logger.error('❌ Database connection failed:', error);
    process.exit(1);
  }
}

// Database disconnection helper
export async function disconnectDatabase(): Promise<void> {
  await prisma.$disconnect();
  logger.info('Database disconnected');
}

// Graceful shutdown
process.on('beforeExit', async () => {
  await disconnectDatabase();
});