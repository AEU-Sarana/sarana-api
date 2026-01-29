import Queue from 'bull';
import { env } from '@src/shared/config/env';
import { logger } from '@src/shared/utils/logger';

/**
 * Queue Utility
 * 
 * Provides helper functions for creating and managing Bull queues.
 * All queues use Redis for job storage and processing.
 */
export class QueueUtil {
  /**
   * Create a Bull queue instance
   * 
   * @param queueName - Unique name for the queue
   * @param options - Optional queue configuration
   * @returns Bull queue instance
   */
  static createQueue<T = any>(
    queueName: string,
    options?: Queue.QueueOptions
  ): Queue.Queue<T> {
    const redisUrl = env.REDIS_URL || `redis://localhost:${env.REDIS_PORT}`;

    const queue = new Queue<T>(queueName, redisUrl, {
      defaultJobOptions: {
        removeOnComplete: {
          age: 24 * 3600, // Keep completed jobs for 24 hours
          count: 1000, // Keep last 1000 completed jobs
        },
        removeOnFail: {
          age: 7 * 24 * 3600, // Keep failed jobs for 7 days
        },
        attempts: 3, // Retry failed jobs 3 times
        backoff: {
          type: 'exponential',
          delay: 2000, // Start with 2 second delay
        },
      },
      ...options,
    });

    // Queue event listeners
    queue.on('error', (error) => {
      logger.error(`Queue ${queueName} error:`, error);
    });

    queue.on('waiting', (jobId) => {
      logger.debug(`Job ${jobId} is waiting in queue ${queueName}`);
    });

    queue.on('active', (job) => {
      logger.info(`Job ${job.id} started processing in queue ${queueName}`);
    });

    queue.on('completed', (job, result) => {
      logger.info(`Job ${job.id} completed in queue ${queueName}`, { result });
    });

    queue.on('failed', (job, error) => {
      logger.error(`Job ${job?.id} failed in queue ${queueName}:`, error);
    });

    queue.on('stalled', (job) => {
      logger.warn(`Job ${job.id} stalled in queue ${queueName}`);
    });

    logger.info(`Queue ${queueName} initialized successfully`);

    return queue;
  }

  /**
   * Gracefully close a queue
   * 
   * @param queue - Queue instance to close
   */
  static async closeQueue(queue: Queue.Queue): Promise<void> {
    try {
      await queue.close();
      logger.info(`Queue ${queue.name} closed successfully`);
    } catch (error) {
      logger.error(`Error closing queue ${queue.name}:`, error);
      throw error;
    }
  }
}
