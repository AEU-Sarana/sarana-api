"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.S3StorageProvider = void 0;
const client_s3_1 = require("@aws-sdk/client-s3");
const env_1 = require("../../../shared/config/env");
const logger_1 = require("../../../shared/utils/logger");
/**
 * S3-Compatible Storage Provider
 *
 * Works with:
 * - MinIO (local development)
 * - Cloudflare R2
 * - Wasabi
 * - AWS S3
 * - Any S3-compatible service
 */
class S3StorageProvider {
    constructor() {
        if (!env_1.env.STORAGE_ENDPOINT || !env_1.env.STORAGE_ACCESS_KEY || !env_1.env.STORAGE_SECRET_KEY) {
            throw new Error('Storage configuration missing. Please set STORAGE_ENDPOINT, STORAGE_ACCESS_KEY, and STORAGE_SECRET_KEY in .env');
        }
        this.bucket = env_1.env.STORAGE_BUCKET;
        this.publicUrl = env_1.env.STORAGE_PUBLIC_URL;
        // Initialize S3 client
        this.s3Client = new client_s3_1.S3Client({
            endpoint: env_1.env.STORAGE_ENDPOINT,
            region: env_1.env.STORAGE_REGION,
            credentials: {
                accessKeyId: env_1.env.STORAGE_ACCESS_KEY,
                secretAccessKey: env_1.env.STORAGE_SECRET_KEY,
            },
            forcePathStyle: true, // Required for MinIO and some S3-compatible services
        });
        logger_1.logger.info(`Storage provider initialized: ${env_1.env.STORAGE_PROVIDER}`);
        logger_1.logger.info(`Storage endpoint: ${env_1.env.STORAGE_ENDPOINT}`);
        logger_1.logger.info(`Storage bucket: ${this.bucket}`);
        // Ensure bucket exists (non-blocking, will retry on first upload if needed)
        this.ensureBucketExists().catch((error) => {
            logger_1.logger.warn('Failed to verify bucket existence on startup, will retry on first upload', {
                bucket: this.bucket,
                error: error.message,
            });
        });
    }
    /**
     * Ensure bucket exists, create if it doesn't
     */
    async ensureBucketExists() {
        try {
            // Check if bucket exists
            await this.s3Client.send(new client_s3_1.HeadBucketCommand({ Bucket: this.bucket }));
            logger_1.logger.info(`Bucket ${this.bucket} exists`);
        }
        catch (error) {
            // Bucket doesn't exist or access denied
            if (error.name === 'NotFound' || error.$metadata?.httpStatusCode === 404) {
                try {
                    // Create bucket - for MinIO/local development, don't specify region
                    await this.s3Client.send(new client_s3_1.CreateBucketCommand({
                        Bucket: this.bucket,
                    }));
                    logger_1.logger.info(`Bucket ${this.bucket} created successfully`);
                }
                catch (createError) {
                    logger_1.logger.error(`Failed to create bucket ${this.bucket}:`, createError);
                    // Don't throw - let first upload attempt handle the error
                }
            }
            else {
                // Other error (permission denied, etc.)
                logger_1.logger.warn(`Could not verify bucket ${this.bucket}:`, error.message);
                // Don't throw - let first upload attempt handle the error
            }
        }
    }
    /**
     * Upload file to storage
     */
    async upload(file, folder, options) {
        return this.uploadBuffer(file.buffer, file.originalname, options?.contentType || file.mimetype, folder);
    }
    /**
     * Upload a buffer to storage (useful for generated files like PDFs, images)
     */
    async uploadBuffer(buffer, filename, contentType, folder) {
        try {
            // Generate unique filename
            const timestamp = Date.now();
            const randomString = Math.random().toString(36).substring(7);
            const extension = this.getFileExtension(filename);
            const customFilename = filename.includes('.') ? filename : `${timestamp}-${randomString}${extension}`;
            const finalFilename = customFilename.includes('.') ? customFilename : `${customFilename}${extension}`;
            // Build object key (path in storage)
            const key = folder ? `${folder}/${finalFilename}` : finalFilename;
            // Upload to S3-compatible storage
            const putObjectParams = {
                Bucket: this.bucket,
                Key: key,
                Body: buffer,
                ContentType: contentType,
            };
            // Set public-read ACL
            putObjectParams.ACL = 'public-read';
            const command = new client_s3_1.PutObjectCommand(putObjectParams);
            await this.s3Client.send(command);
            // Generate public URL
            const url = this.getPublicUrl(key);
            logger_1.logger.info(`Buffer uploaded successfully: ${key}`);
            return {
                filename: finalFilename,
                key,
                url,
                size: buffer.length,
                mimetype: contentType,
                bucket: this.bucket,
            };
        }
        catch (error) {
            logger_1.logger.error('Failed to upload buffer:', error);
            throw new Error(`Buffer upload failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    /**
     * Delete file from storage
     */
    async delete(key) {
        try {
            const command = new client_s3_1.DeleteObjectCommand({
                Bucket: this.bucket,
                Key: key,
            });
            await this.s3Client.send(command);
            logger_1.logger.info(`File deleted successfully: ${key}`);
        }
        catch (error) {
            logger_1.logger.error(`Failed to delete file ${key}:`, error);
            throw new Error(`File deletion failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    /**
     * Get public URL for a file
     */
    getPublicUrl(key) {
        // Always use our authenticated storage route instead of direct MinIO URLs
        const baseUrl = env_1.env.API_BASE_URL || `http://localhost:${env_1.env.PORT}`;
        return `${baseUrl}/storage/${env_1.env.STORAGE_BUCKET || 'stock-pos-storage'}/${key}`;
    }
    /**
     * Check if file exists
     */
    async exists(key) {
        try {
            const command = new client_s3_1.HeadObjectCommand({
                Bucket: this.bucket,
                Key: key,
            });
            await this.s3Client.send(command);
            return true;
        }
        catch (error) {
            if (error.name === 'NotFound' || error.$metadata?.httpStatusCode === 404) {
                return false;
            }
            throw error;
        }
    }
    /**
     * Get file metadata
     */
    async getMetadata(key) {
        try {
            const command = new client_s3_1.HeadObjectCommand({
                Bucket: this.bucket,
                Key: key,
            });
            const response = await this.s3Client.send(command);
            if (!response.LastModified) {
                return null;
            }
            return {
                key,
                size: response.ContentLength || 0,
                contentType: response.ContentType || 'application/octet-stream',
                lastModified: response.LastModified,
                etag: response.ETag,
                metadata: response.Metadata || {},
            };
        }
        catch (error) {
            if (error.name === 'NotFound' || error.$metadata?.httpStatusCode === 404) {
                return null;
            }
            throw error;
        }
    }
    /**
     * List files in a folder/prefix
     */
    async listFiles(prefix) {
        const items = [];
        let continuationToken;
        do {
            const response = await this.s3Client.send(new client_s3_1.ListObjectsV2Command({
                Bucket: this.bucket,
                Prefix: prefix,
                ContinuationToken: continuationToken,
            }));
            for (const object of response.Contents ?? []) {
                if (!object.Key || !object.LastModified) {
                    continue;
                }
                items.push({
                    key: object.Key,
                    size: object.Size ?? 0,
                    lastModified: object.LastModified,
                });
            }
            continuationToken = response.IsTruncated ? response.NextContinuationToken : undefined;
        } while (continuationToken);
        return items;
    }
    /**
     * Download file as buffer by key
     */
    async downloadFileBuffer(key) {
        try {
            const response = await this.s3Client.send(new client_s3_1.GetObjectCommand({
                Bucket: this.bucket,
                Key: key,
            }));
            if (!response.Body) {
                throw new Error('Empty response body');
            }
            const bytes = await response.Body.transformToByteArray();
            return Buffer.from(bytes);
        }
        catch (error) {
            if (error.name === 'NotFound' || error.$metadata?.httpStatusCode === 404) {
                throw new Error(`File not found: ${key}`);
            }
            throw error;
        }
    }
    /**
     * Get file extension from filename
     */
    getFileExtension(filename) {
        const lastDot = filename.lastIndexOf('.');
        return lastDot !== -1 ? filename.substring(lastDot) : '';
    }
}
exports.S3StorageProvider = S3StorageProvider;
//# sourceMappingURL=s3-storage.provider.js.map