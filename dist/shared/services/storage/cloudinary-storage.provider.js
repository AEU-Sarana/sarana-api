"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CloudinaryStorageProvider = void 0;
const cloudinary_1 = require("cloudinary");
const env_1 = require("../../../shared/config/env");
const logger_1 = require("../../../shared/utils/logger");
/**
 * Cloudinary Storage Provider
 *
 * Uploads and manages files using Cloudinary CDN.
 */
class CloudinaryStorageProvider {
    constructor() {
        if (env_1.env.CLOUDINARY_URL) {
            cloudinary_1.v2.config({
                cloudinary_url: env_1.env.CLOUDINARY_URL,
                secure: true,
            });
            logger_1.logger.info(`Storage provider initialized: Cloudinary (via CLOUDINARY_URL)`);
        }
        else if (env_1.env.CLOUDINARY_CLOUD_NAME && env_1.env.CLOUDINARY_API_KEY && env_1.env.CLOUDINARY_API_SECRET) {
            cloudinary_1.v2.config({
                cloud_name: env_1.env.CLOUDINARY_CLOUD_NAME,
                api_key: env_1.env.CLOUDINARY_API_KEY,
                api_secret: env_1.env.CLOUDINARY_API_SECRET,
                secure: true,
            });
            logger_1.logger.info(`Storage provider initialized: Cloudinary (${env_1.env.CLOUDINARY_CLOUD_NAME})`);
        }
        else if (env_1.env.CLOUDINARY_CLOUD_NAME && env_1.env.CLOUDINARY_API_SECRET) {
            cloudinary_1.v2.config({
                cloud_name: env_1.env.CLOUDINARY_CLOUD_NAME,
                api_secret: env_1.env.CLOUDINARY_API_SECRET,
                secure: true,
            });
            logger_1.logger.warn(`Storage provider initialized with partial Cloudinary config (waiting for CLOUDINARY_API_KEY)`);
        }
        else {
            logger_1.logger.warn('Cloudinary configuration missing. Please set CLOUDINARY_API_KEY in .env');
        }
    }
    /**
     * Upload file from multer
     */
    async upload(file, folder, options) {
        return this.uploadBuffer(file.buffer, file.originalname, options?.contentType || file.mimetype, folder);
    }
    /**
     * Upload buffer to Cloudinary
     */
    async uploadBuffer(buffer, filename, contentType, folder) {
        return new Promise((resolve, reject) => {
            // Remove extension for public_id
            const publicIdName = filename.replace(/\.[^/.]+$/, '');
            const timestamp = Date.now();
            const publicId = `${publicIdName}_${timestamp}`;
            const uploadOptions = {
                public_id: publicId,
                resource_type: 'auto',
            };
            if (folder) {
                uploadOptions.folder = folder;
            }
            const stream = cloudinary_1.v2.uploader.upload_stream(uploadOptions, (error, result) => {
                if (error || !result) {
                    logger_1.logger.error('Cloudinary upload error:', error);
                    return reject(new Error(`Cloudinary upload failed: ${error?.message || 'Unknown error'}`));
                }
                const key = result.public_id;
                const url = result.secure_url;
                logger_1.logger.info(`File uploaded to Cloudinary successfully: ${key}`);
                resolve({
                    filename: `${result.public_id}.${result.format || 'jpg'}`,
                    key: key,
                    url: url,
                    size: result.bytes || buffer.length,
                    mimetype: contentType,
                    bucket: env_1.env.CLOUDINARY_CLOUD_NAME || 'cloudinary',
                });
            });
            stream.end(buffer);
        });
    }
    /**
     * Delete file from Cloudinary
     */
    async delete(key) {
        try {
            await cloudinary_1.v2.uploader.destroy(key);
            logger_1.logger.info(`File deleted from Cloudinary: ${key}`);
        }
        catch (error) {
            logger_1.logger.error(`Failed to delete file ${key} from Cloudinary:`, error);
            throw new Error(`Cloudinary deletion failed: ${error?.message || 'Unknown error'}`);
        }
    }
    /**
     * Get public URL for a file
     */
    getPublicUrl(key) {
        return cloudinary_1.v2.url(key, { secure: true });
    }
    /**
     * Check if file exists
     */
    async exists(key) {
        try {
            await cloudinary_1.v2.api.resource(key);
            return true;
        }
        catch (error) {
            if (error?.http_code === 404) {
                return false;
            }
            return false;
        }
    }
    /**
     * Get file metadata
     */
    async getMetadata(key) {
        try {
            const resource = await cloudinary_1.v2.api.resource(key);
            return {
                key: resource.public_id,
                size: resource.bytes || 0,
                contentType: `${resource.resource_type}/${resource.format}`,
                lastModified: new Date(resource.created_at),
            };
        }
        catch (error) {
            return null;
        }
    }
    /**
     * List files in folder
     */
    async listFiles(prefix) {
        try {
            const result = await cloudinary_1.v2.api.resources({
                type: 'upload',
                prefix: prefix,
                max_results: 500,
            });
            return (result.resources || []).map((res) => ({
                key: res.public_id,
                size: res.bytes || 0,
                lastModified: new Date(res.created_at),
            }));
        }
        catch (error) {
            logger_1.logger.error('Failed to list Cloudinary files:', error);
            return [];
        }
    }
    /**
     * Download file buffer
     */
    async downloadFileBuffer(key) {
        const url = this.getPublicUrl(key);
        const response = await fetch(url);
        const arrayBuffer = await response.arrayBuffer();
        return Buffer.from(arrayBuffer);
    }
}
exports.CloudinaryStorageProvider = CloudinaryStorageProvider;
//# sourceMappingURL=cloudinary-storage.provider.js.map