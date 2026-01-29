import { env } from '@src/shared/config/env';
import { logger } from '@src/shared/utils/logger';
import type { IStorageProvider } from './storage-provider.interface';
import { S3StorageProvider } from './s3-storage.provider';

/**
 * Storage Factory
 * 
 * Creates and returns the appropriate storage provider based on configuration.
 * 
 * Supported providers:
 * - minio: MinIO (S3-compatible local development)
 * - r2: Cloudflare R2
 * - wasabi: Wasabi Cloud Storage
 * - s3: AWS S3
 * - Any S3-compatible service
 */
export class StorageFactory {
  private static instance: IStorageProvider | null = null;

  /**
   * Get storage provider instance (singleton)
   */
  static getInstance(): IStorageProvider {
    if (this.instance) {
      return this.instance;
    }

    const provider = env.STORAGE_PROVIDER.toLowerCase();

    switch (provider) {
      case 'minio':
      case 'r2':
      case 'wasabi':
      case 's3':
      case 'aws':
        // All S3-compatible services use the same provider
        this.instance = new S3StorageProvider();
        break;

      default:
        logger.warn(`Unknown storage provider: ${provider}. Falling back to S3-compatible provider (MinIO).`);
        this.instance = new S3StorageProvider();
    }

    return this.instance;
  }

  /**
   * Reset instance (useful for testing)
   */
  static reset(): void {
    this.instance = null;
  }
}

