import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
} from '@aws-sdk/client-s3';
import { env } from '@src/shared/config/env';
import { logger } from '@src/shared/utils/logger';
import type {
  IStorageProvider,
  FileUploadResult,
  UploadOptions,
  FileMetadata,
} from './storage-provider.interface';
import type multer from 'multer';

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
export class S3StorageProvider implements IStorageProvider {
  private s3Client: S3Client;
  private bucket: string;
  private publicUrl?: string;

  constructor() {
    if (!env.STORAGE_ENDPOINT || !env.STORAGE_ACCESS_KEY || !env.STORAGE_SECRET_KEY) {
      throw new Error(
        'Storage configuration missing. Please set STORAGE_ENDPOINT, STORAGE_ACCESS_KEY, and STORAGE_SECRET_KEY in .env'
      );
    }

    this.bucket = env.STORAGE_BUCKET;
    this.publicUrl = env.STORAGE_PUBLIC_URL;

    // Initialize S3 client
    this.s3Client = new S3Client({
      endpoint: env.STORAGE_ENDPOINT,
      region: env.STORAGE_REGION,
      credentials: {
        accessKeyId: env.STORAGE_ACCESS_KEY,
        secretAccessKey: env.STORAGE_SECRET_KEY,
      },
      forcePathStyle: true, // Required for MinIO and some S3-compatible services
    });

    logger.info(`Storage provider initialized: ${env.STORAGE_PROVIDER}`);
    logger.info(`Storage endpoint: ${env.STORAGE_ENDPOINT}`);
    logger.info(`Storage bucket: ${this.bucket}`);
  }

  /**
   * Upload file to storage
   */
  async upload(
    file: Express.Multer.File,
    folder?: string,
    options?: UploadOptions
  ): Promise<FileUploadResult> {
    try {
      // Generate unique filename
      const timestamp = Date.now();
      const randomString = Math.random().toString(36).substring(7);
      const extension = this.getFileExtension(file.originalname);
      const customFilename = options?.filename || `${timestamp}-${randomString}`;
      const filename = `${customFilename}${extension}`;

      // Build object key (path in storage)
      const key = folder ? `${folder}/${filename}` : filename;

      // Prepare metadata
      const metadata: Record<string, string> = {
        originalName: file.originalname,
        uploadedAt: new Date().toISOString(),
        ...(options?.metadata || {}),
      };

      // Upload to S3-compatible storage
      // Note: ACL is deprecated in some S3 services (R2, etc.)
      // Use bucket policies instead for public access
      // For MinIO, you can set bucket policy via console
      const putObjectParams: any = {
        Bucket: this.bucket,
        Key: key,
        Body: file.buffer,
        ContentType: options?.contentType || file.mimetype,
        Metadata: metadata,
      };

      // Add ACL if public access is desired (may not work for R2, but won't break)
      if (options?.public !== false) {
        putObjectParams.ACL = 'public-read';
      }

      const command = new PutObjectCommand(putObjectParams);

      await this.s3Client.send(command);

      // Generate public URL
      const url = this.getPublicUrl(key);

      logger.info(`File uploaded successfully: ${key}`);

      return {
        filename,
        key,
        url,
        size: file.size,
        mimetype: file.mimetype,
        bucket: this.bucket,
      };
    } catch (error) {
      logger.error('Failed to upload file:', error);
      throw new Error(`File upload failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Delete file from storage
   */
  async delete(key: string): Promise<void> {
    try {
      const command = new DeleteObjectCommand({
        Bucket: this.bucket,
        Key: key,
      });

      await this.s3Client.send(command);
      logger.info(`File deleted successfully: ${key}`);
    } catch (error) {
      logger.error(`Failed to delete file ${key}:`, error);
      throw new Error(`File deletion failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get public URL for a file
   */
  getPublicUrl(key: string): string {
    if (this.publicUrl) {
      // Use configured public URL
      const baseUrl = this.publicUrl.endsWith('/') 
        ? this.publicUrl.slice(0, -1) 
        : this.publicUrl;
      return `${baseUrl}/${key}`;
    }

    // Fallback: construct URL from endpoint
    const endpoint = env.STORAGE_ENDPOINT || '';
    const baseUrl = endpoint.replace(/\/$/, '');
    return `${baseUrl}/${this.bucket}/${key}`;
  }

  /**
   * Check if file exists
   */
  async exists(key: string): Promise<boolean> {
    try {
      const command = new HeadObjectCommand({
        Bucket: this.bucket,
        Key: key,
      });

      await this.s3Client.send(command);
      return true;
    } catch (error: any) {
      if (error.name === 'NotFound' || error.$metadata?.httpStatusCode === 404) {
        return false;
      }
      throw error;
    }
  }

  /**
   * Get file metadata
   */
  async getMetadata(key: string): Promise<FileMetadata | null> {
    try {
      const command = new HeadObjectCommand({
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
      };
    } catch (error: any) {
      if (error.name === 'NotFound' || error.$metadata?.httpStatusCode === 404) {
        return null;
      }
      throw error;
    }
  }

  /**
   * Get file extension from filename
   */
  private getFileExtension(filename: string): string {
    const lastDot = filename.lastIndexOf('.');
    return lastDot !== -1 ? filename.substring(lastDot) : '';
  }
}