"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.StorageFactory = void 0;
const env_1 = require("../../../shared/config/env");
const logger_1 = require("../../../shared/utils/logger");
const s3_storage_provider_1 = require("./s3-storage.provider");
const cloudinary_storage_provider_1 = require("./cloudinary-storage.provider");
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
 * - cloudinary: Cloudinary Cloud Storage
 */
class StorageFactory {
    /**
     * Get storage provider instance (singleton)
     */
    static getInstance() {
        if (this.instance) {
            return this.instance;
        }
        const provider = env_1.env.STORAGE_PROVIDER.toLowerCase();
        switch (provider) {
            case 'cloudinary':
                this.instance = new cloudinary_storage_provider_1.CloudinaryStorageProvider();
                break;
            case 'minio':
            case 'r2':
            case 'wasabi':
            case 's3':
            case 'aws':
                // All S3-compatible services use the same provider
                this.instance = new s3_storage_provider_1.S3StorageProvider();
                break;
            default:
                logger_1.logger.warn(`Unknown storage provider: ${provider}. Falling back to S3-compatible provider (MinIO).`);
                this.instance = new s3_storage_provider_1.S3StorageProvider();
        }
        return this.instance;
    }
    /**
     * Reset instance (useful for testing)
     */
    static reset() {
        this.instance = null;
    }
}
exports.StorageFactory = StorageFactory;
StorageFactory.instance = null;
//# sourceMappingURL=storage.factory.js.map