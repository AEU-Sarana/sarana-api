import { v2 as cloudinary, UploadApiResponse } from 'cloudinary';
import { env } from '@src/shared/config/env';
import { logger } from '@src/shared/utils/logger';
import { LocalStorageProvider } from './local-storage.provider';
import type {
  IStorageProvider,
  FileUploadResult,
  UploadOptions,
  FileMetadata,
  StorageFileObject,
} from './storage-provider.interface';

/**
 * Cloudinary Storage Provider
 * 
 * Uploads and manages files using Cloudinary CDN.
 * Includes graceful fallback to LocalStorageProvider if credentials are invalid or missing.
 */
export class CloudinaryStorageProvider implements IStorageProvider {
  private isConfigured = false;
  private localFallback = new LocalStorageProvider();

  constructor() {
    let cloudName = env.CLOUDINARY_CLOUD_NAME;
    let apiKey = env.CLOUDINARY_API_KEY;
    let apiSecret = env.CLOUDINARY_API_SECRET;

    if (env.CLOUDINARY_URL) {
      try {
        const parsed = new URL(env.CLOUDINARY_URL);
        cloudName = parsed.hostname || cloudName;
        apiKey = parsed.username || apiKey;
        apiSecret = parsed.password || apiSecret;
      } catch (err) {
        logger.warn('Failed to parse CLOUDINARY_URL', { error: err });
      }
    }

    if (cloudName && apiKey && apiSecret) {
      cloudinary.config({
        cloud_name: cloudName,
        api_key: apiKey,
        api_secret: apiSecret,
        secure: true,
      });
      this.isConfigured = true;
      logger.info(`Storage provider initialized: Cloudinary (${cloudName})`);
    } else if (cloudName && apiSecret) {
      cloudinary.config({
        cloud_name: cloudName,
        api_secret: apiSecret,
        secure: true,
      });
      logger.warn(`Storage provider initialized with partial Cloudinary config (waiting for CLOUDINARY_API_KEY)`);
    } else {
      logger.warn('Cloudinary configuration missing. Please set CLOUDINARY_API_KEY in .env');
    }
  }

  /**
   * Upload file from multer
   */
  async upload(
    file: Express.Multer.File,
    folder?: string,
    options?: UploadOptions
  ): Promise<FileUploadResult> {
    return this.uploadBuffer(
      file.buffer,
      options?.filename || file.originalname,
      options?.contentType || file.mimetype,
      folder
    );
  }

  /**
   * Upload buffer to Cloudinary with fallback to local storage
   */
  async uploadBuffer(
    buffer: Buffer,
    filename: string,
    contentType: string,
    folder?: string
  ): Promise<FileUploadResult> {
    if (!this.isConfigured) {
      logger.warn('Cloudinary not fully configured, falling back to local storage');
      return this.localFallback.uploadBuffer(buffer, filename, contentType, folder);
    }

    try {
      return await new Promise<FileUploadResult>((resolve, reject) => {
        // Remove extension for public_id
        const publicIdName = filename.replace(/\.[^/.]+$/, '');
        const timestamp = Date.now();
        const publicId = `${publicIdName}_${timestamp}`;

        const uploadOptions: Record<string, any> = {
          public_id: publicId,
          resource_type: 'auto',
        };

        if (folder) {
          uploadOptions.folder = folder;
        }

        const stream = cloudinary.uploader.upload_stream(
          uploadOptions,
          (error, result: UploadApiResponse | undefined) => {
            if (error || !result) {
              logger.error('Cloudinary upload error:', error);
              return reject(new Error(`Cloudinary upload failed: ${error?.message || 'Unknown error'}`));
            }

            const key = result.public_id;
            const url = result.secure_url;

            logger.info(`File uploaded to Cloudinary successfully: ${key}`);

            resolve({
              filename: `${result.public_id}.${result.format || 'jpg'}`,
              key: key,
              url: url,
              size: result.bytes || buffer.length,
              mimetype: contentType,
              bucket: env.CLOUDINARY_CLOUD_NAME || 'cloudinary',
            });
          }
        );

        stream.end(buffer);
      });
    } catch (error: any) {
      logger.warn(`Cloudinary upload failed (${error?.message}). Falling back to local storage...`);
      return this.localFallback.uploadBuffer(buffer, filename, contentType, folder);
    }
  }

  /**
   * Delete file from Cloudinary or local storage
   */
  async delete(key: string): Promise<void> {
    try {
      if (await this.localFallback.exists(key)) {
        await this.localFallback.delete(key);
        return;
      }
      await cloudinary.uploader.destroy(key);
      logger.info(`File deleted from Cloudinary: ${key}`);
    } catch (error: any) {
      logger.error(`Failed to delete file ${key} from Cloudinary:`, error);
      // Fallback: try deleting locally if exists
      await this.localFallback.delete(key);
    }
  }

  /**
   * Get public URL for a file
   */
  getPublicUrl(key: string): string {
    return cloudinary.url(key, { secure: true });
  }

  /**
   * Check if file exists
   */
  async exists(key: string): Promise<boolean> {
    try {
      if (await this.localFallback.exists(key)) {
        return true;
      }
      await cloudinary.api.resource(key);
      return true;
    } catch (error: any) {
      return false;
    }
  }

  /**
   * Get file metadata
   */
  async getMetadata(key: string): Promise<FileMetadata | null> {
    try {
      if (await this.localFallback.exists(key)) {
        return this.localFallback.getMetadata(key);
      }
      const resource = await cloudinary.api.resource(key);
      return {
        key: resource.public_id,
        size: resource.bytes || 0,
        contentType: `${resource.resource_type}/${resource.format}`,
        lastModified: new Date(resource.created_at),
      };
    } catch (error: any) {
      return null;
    }
  }

  /**
   * List files in folder
   */
  async listFiles(prefix?: string): Promise<StorageFileObject[]> {
    try {
      const result = await cloudinary.api.resources({
        type: 'upload',
        prefix: prefix,
        max_results: 500,
      });

      return (result.resources || []).map((res: any) => ({
        key: res.public_id,
        size: res.bytes || 0,
        lastModified: new Date(res.created_at),
      }));
    } catch (error) {
      logger.error('Failed to list Cloudinary files:', error);
      return this.localFallback.listFiles(prefix);
    }
  }

  /**
   * Download file buffer
   */
  async downloadFileBuffer(key: string): Promise<Buffer> {
    if (await this.localFallback.exists(key)) {
      return this.localFallback.downloadFileBuffer(key);
    }
    const url = this.getPublicUrl(key);
    const response = await fetch(url);
    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer);
  }
}
