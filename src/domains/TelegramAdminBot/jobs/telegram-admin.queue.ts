import { Queue } from 'bullmq';
import IORedis from 'ioredis';
import { env } from '@src/shared/config/env';
import { logger } from '@src/shared/utils/logger';

const redisUrl = env.REDIS_URL || process.env.REDIS_URL;
const redisHost = env.REDIS_HOST || process.env.REDIS_HOST || 'redis';
const redisPort = Number(process.env.REDIS_PORT || env.REDIS_PORT || 6379);
const redisPassword = env.REDIS_PASSWORD || process.env.REDIS_PASSWORD || undefined;

const resolveRedisOptions = () => {
  if (redisUrl) {
    const parsed = new URL(redisUrl);
    return {
      host: parsed.hostname,
      port: Number(parsed.port || 6379),
      password: parsed.password || undefined,
    };
  }
  return {
    host: redisHost,
    port: redisPort,
    password: redisPassword,
  };
};

export const redisOptions = {
  ...resolveRedisOptions(),
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
};

export const redisConnection = new IORedis(redisOptions);

redisConnection.on('error', (error) => {
  logger.error('Redis connection error (telegram admin queue)', { error: error.message });
});

export const TELEGRAM_ADMIN_QUEUE_NAME = 'telegram-admin-jobs';

export const telegramAdminQueue = new Queue(TELEGRAM_ADMIN_QUEUE_NAME, {
  connection: redisOptions,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: 'exponential', delay: 2000 },
    removeOnComplete: { age: 3600, count: 500 },
    removeOnFail: { age: 24 * 3600 },
  },
});
