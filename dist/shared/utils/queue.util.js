"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.QueueUtil = void 0;
const bull_1 = __importDefault(require("bull"));
const env_1 = require("../../shared/config/env");
const logger_1 = require("../../shared/utils/logger");
/**
 * Queue Utility
 *
 * Provides helper functions for creating and managing Bull queues.
 * All queues use Redis for job storage and processing.
 */
class QueueUtil {
    /**
     * Create a Bull queue instance
     *
     * @param queueName - Unique name for the queue
     * @param options - Optional queue configuration
     * @returns Bull queue instance
     */
    static createQueue(queueName, options) {
        const redisUrl = env_1.env.REDIS_URL || `redis://localhost:${env_1.env.REDIS_PORT}`;
        const queue = new bull_1.default(queueName, redisUrl, {
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
            logger_1.logger.error(`Queue ${queueName} error:`, error);
        });
        queue.on('waiting', (jobId) => {
            logger_1.logger.debug(`Job ${jobId} is waiting in queue ${queueName}`);
        });
        queue.on('active', (job) => {
            logger_1.logger.info(`Job ${job.id} started processing in queue ${queueName}`);
        });
        queue.on('completed', (job, result) => {
            logger_1.logger.info(`Job ${job.id} completed in queue ${queueName}`, { result });
        });
        queue.on('failed', (job, error) => {
            logger_1.logger.error(`Job ${job?.id} failed in queue ${queueName}:`, error);
        });
        queue.on('stalled', (job) => {
            logger_1.logger.warn(`Job ${job.id} stalled in queue ${queueName}`);
        });
        logger_1.logger.info(`Queue ${queueName} initialized successfully`);
        return queue;
    }
    /**
     * Gracefully close a queue
     *
     * @param queue - Queue instance to close
     */
    static async closeQueue(queue) {
        try {
            await queue.close();
            logger_1.logger.info(`Queue ${queue.name} closed successfully`);
        }
        catch (error) {
            logger_1.logger.error(`Error closing queue ${queue.name}:`, error);
            throw error;
        }
    }
}
exports.QueueUtil = QueueUtil;
//# sourceMappingURL=queue.util.js.map