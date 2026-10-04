"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.fileStorageService = exports.FileStorageService = void 0;
const constants_1 = require("../../shared/config/constants");
const env_1 = require("../../shared/config/env");
const logger_1 = require("../../shared/utils/logger");
const storage_factory_1 = require("./storage/storage.factory");
/**
 * File Storage Service
 *
 * Flexible and scalable file storage service that supports:
 * - MinIO (local development)
 * - Cloudflare R2
 * - Wasabi
 * - AWS S3
 * - Any S3-compatible service
 *
 * Switch providers by changing STORAGE_PROVIDER in .env
 */
class FileStorageService {
    constructor() {
        this.storageProvider = storage_factory_1.StorageFactory.getInstance();
    }
    /**
     * Upload file to storage
     *
     * @param file - Multer file object
     * @param folder - Optional folder/path in storage (e.g., 'products', 'users/avatars')
     * @param options - Upload options (filename, contentType, metadata, etc.)
     * @returns File upload result with URL
     */
    async uploadFile(file, folder, options) {
        // Validate file size
        if (file.size > constants_1.APP_CONSTANTS.MAX_FILE_SIZE) {
            throw new Error(`File size exceeds maximum allowed size of ${constants_1.APP_CONSTANTS.MAX_FILE_SIZE} bytes`);
        }
        // Validate file type (for images) - skip for reports (CSV/PDF)
        const contentType = options?.contentType ?? '';
        const mimeType = file.mimetype ?? '';
        const isReportFile = contentType.includes('csv') ||
            contentType.includes('pdf') ||
            contentType.includes('spreadsheetml') ||
            contentType.includes('xlsx') ||
            mimeType.includes('csv') ||
            mimeType.includes('pdf') ||
            mimeType.includes('spreadsheetml') ||
            mimeType.includes('xlsx');
        if (!isReportFile && !constants_1.APP_CONSTANTS.ALLOWED_IMAGE_TYPES.includes(file.mimetype)) {
            throw new Error(`File type not allowed. Allowed types: ${constants_1.APP_CONSTANTS.ALLOWED_IMAGE_TYPES.join(', ')}`);
        }
        try {
            const result = await this.storageProvider.upload(file, folder, options);
            logger_1.logger.info(`File uploaded: ${result.key} -> ${result.url}`);
            return result;
        }
        catch (error) {
            logger_1.logger.error('File upload failed:', error);
            throw error;
        }
    }
    /**
     * Save uploaded file (backward compatibility)
     *
     * @deprecated Use uploadFile instead
     */
    async saveFile(file, subfolder) {
        return this.uploadFile(file, subfolder);
    }
    /**
     * Upload a buffer directly to storage (useful for generated files like PDFs, images)
     */
    async uploadBuffer(buffer, filename, contentType, folder) {
        try {
            const result = await this.storageProvider.uploadBuffer(buffer, filename, contentType, folder);
            logger_1.logger.info(`Buffer uploaded: ${result.key} -> ${result.url}`);
            return result;
        }
        catch (error) {
            logger_1.logger.error('Buffer upload failed:', error);
            throw error;
        }
    }
    /**
     * Delete file from storage
     *
     * @param key - Object key/path in storage (returned from uploadFile)
     */
    async deleteFile(key) {
        try {
            await this.storageProvider.delete(key);
            logger_1.logger.info(`File deleted: ${key}`);
        }
        catch (error) {
            logger_1.logger.error(`Failed to delete file ${key}:`, error);
            throw error;
        }
    }
    /**
     * Get public URL for a file
     *
     * @param key - Object key/path in storage
     * @returns Public URL to access the file
     */
    getFileUrl(key) {
        return this.storageProvider.getPublicUrl(key);
    }
    /**
     * Check if file exists
     *
     * @param key - Object key/path in storage
     * @returns True if file exists
     */
    async fileExists(key) {
        return this.storageProvider.exists(key);
    }
    /**
     * Get file metadata
     *
     * @param key - Object key/path in storage
     * @returns File metadata or null if not found
     */
    async getFileMetadata(key) {
        return this.storageProvider.getMetadata(key);
    }
    /**
     * List files by prefix/folder
     */
    async listFiles(prefix) {
        return this.storageProvider.listFiles(prefix);
    }
    /**
     * Download file as buffer by key
     */
    async downloadFileBuffer(key) {
        return this.storageProvider.downloadFileBuffer(key);
    }
    /**
     * Extract storage key from a public URL
     *
     * This is useful when you need to delete a file using its URL
     *
     * @param url - Public URL of the file
     * @returns Storage key (path in storage) or null if extraction fails
     */
    extractKeyFromUrl(url) {
        try {
            const urlObj = new URL(url);
            const pathParts = urlObj.pathname.split('/').filter(Boolean);
            const bucketNames = ['stock-pos-storage', env_1.env.STORAGE_BUCKET].filter(Boolean);
            for (const bucketName of bucketNames) {
                const bucketIndex = pathParts.findIndex(part => part === bucketName);
                if (bucketIndex !== -1 && bucketIndex < pathParts.length - 1) {
                    return pathParts.slice(bucketIndex + 1).join('/');
                }
            }
            if (pathParts.length > 1) {
                return pathParts.slice(1).join('/');
            }
            // If only one part, it might be the key itself
            if (pathParts.length === 1) {
                return pathParts[0];
            }
            return null;
        }
        catch {
            // If URL parsing fails, try simple string extraction
            const urlParts = url.split('/').filter(Boolean);
            const bucketNames = ['stock-pos-storage', env_1.env.STORAGE_BUCKET].filter(Boolean);
            for (const bucketName of bucketNames) {
                const bucketIndex = urlParts.findIndex(part => part === bucketName);
                if (bucketIndex !== -1 && bucketIndex < urlParts.length - 1) {
                    return urlParts.slice(bucketIndex + 1).join('/');
                }
            }
            return null;
        }
    }
}
exports.FileStorageService = FileStorageService;
exports.fileStorageService = new FileStorageService();
//# sourceMappingURL=file-storage.service.js.map