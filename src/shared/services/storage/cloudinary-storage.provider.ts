import { v2 as cloudinary, UploadApiResponse } from 'cloudinary';
import { env } from '@src/shared/config/env';
import { logger } from '@src/shared/utils/logger';
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
 */
export class CloudinaryStorageProvider implements IStorageProvider {
  constructor() {
    if (env.CLOUDINARY_URL) {
      cloudinary.config({
        cloudinary_url: env.CLOUDINARY_URL,
        secure: true,
      });
      logger.info(`Storage provider initialized: Cloudinary (via CLOUDINARY_URL)`);
    } else if (env.CLOUDINARY_CLOUD_NAME && env.CLOUDINARY_API_KEY && env.CLOUDINARY_API_SECRET) {
      cloudinary.config({
        cloud_name: env.CLOUDINARY_CLOUD_NAME,
        api_key: env.CLOUDINARY_API_KEY,
        api_secret: env.CLOUDINARY_API_SECRET,
        secure: true,
      });
      logger.info(`Storage provider initialized: Cloudinary (${env.CLOUDINARY_CLOUD_NAME})`);
    } else if (env.CLOUDINARY_CLOUD_NAME && env.CLOUDINARY_API_SECRET) {
      cloudinary.config({
        cloud_name: env.CLOUDINARY_CLOUD_NAME,
        api_secret: env.CLOUDINARY_API_SECRET,
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
      file.originalname,
      options?.contentType || file.mimetype,
      folder
    );
  }

  /**
   * Upload buffer to Cloudinary
   */
  async uploadBuffer(
    buffer: Buffer,
    filename: string,
    contentType: string,
    folder?: string
  ): Promise<FileUploadResult> {
    return new Promise((resolve, reject) => {
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
  }

  /**
   * Delete file from Cloudinary
   */
  async delete(key: string): Promise<void> {
    try {
      await cloudinary.uploader.destroy(key);
      logger.info(`File deleted from Cloudinary: ${key}`);
    } catch (error: any) {
      logger.error(`Failed to delete file ${key} from Cloudinary:`, error);
      throw new Error(`Cloudinary deletion failed: ${error?.message || 'Unknown error'}`);
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
      await cloudinary.api.resource(key);
      return true;
    } catch (error: any) {
      if (error?.http_code === 404) {
        return false;
      }
      return false;
    }
  }

  /**
   * Get file metadata
   */
  async getMetadata(key: string): Promise<FileMetadata | null> {
    try {
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
      return [];
    }
  }

  /**
   * Download file buffer
   */
  async downloadFileBuffer(key: string): Promise<Buffer> {
    const url = this.getPublicUrl(key);
    const response = await fetch(url);
    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer);
  }
}
