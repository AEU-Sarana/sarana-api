import { Queue } from 'bullmq';
import IORedis from 'ioredis';
import { env } from '@src/shared/config/env';
import { logger } from '@src/shared/utils/logger';

const redisHost =
  env.REDIS_HOST || process.env.REDIS_HOST || (env.REDIS_URL ? undefined : 'redis');
const redisPort = Number(process.env.REDIS_PORT || env.REDIS_PORT || 6379);
const redisPassword = env.REDIS_PASSWORD || process.env.REDIS_PASSWORD;

export const redisConnection = env.REDIS_URL
  ? new IORedis(env.REDIS_URL)
  : new IORedis({
      host: redisHost,
      port: redisPort,
      password: redisPassword || undefined,
      maxRetriesPerRequest: null,
      enableReadyCheck: false,
    });

redisConnection.on('error', (error) => {
  logger.error('Redis connection error (telegram admin queue)', { error: error.message });
});

export const TELEGRAM_ADMIN_QUEUE_NAME = 'telegram-admin-jobs';

export const telegramAdminQueue = new Queue(TELEGRAM_ADMIN_QUEUE_NAME, {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: 'exponential', delay: 2000 },
    removeOnComplete: { age: 3600, count: 500 },
    removeOnFail: { age: 24 * 3600 },
  },
});
