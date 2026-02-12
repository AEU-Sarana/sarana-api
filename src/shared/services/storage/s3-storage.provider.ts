import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
  CreateBucketCommand,
  HeadBucketCommand,
  ListObjectsV2Command,
  GetObjectCommand,
} from '@aws-sdk/client-s3';
import { env } from '@src/shared/config/env';
import { logger } from '@src/shared/utils/logger';
import { getLocalNetworkIP } from '@src/shared/utils/helpers';
import type {
  IStorageProvider,
  FileUploadResult,
  UploadOptions,
  FileMetadata,
  StorageFileObject,
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

    // Ensure bucket exists (non-blocking, will retry on first upload if needed)
    this.ensureBucketExists().catch((error) => {
      logger.warn('Failed to verify bucket existence on startup, will retry on first upload', {
        bucket: this.bucket,
        error: error.message,
      });
    });
  }

  /**
   * Ensure bucket exists, create if it doesn't
   */
  private async ensureBucketExists(): Promise<void> {
    try {
      // Check if bucket exists
      await this.s3Client.send(
        new HeadBucketCommand({ Bucket: this.bucket })
      );
      logger.info(`Bucket ${this.bucket} exists`);
    } catch (error: any) {
      // Bucket doesn't exist or access denied
      if (error.name === 'NotFound' || error.$metadata?.httpStatusCode === 404) {
        try {
          // Create bucket - for MinIO/local development, don't specify region
          await this.s3Client.send(
            new CreateBucketCommand({
              Bucket: this.bucket,
            })
          );
          logger.info(`Bucket ${this.bucket} created successfully`);
        } catch (createError: any) {
          logger.error(`Failed to create bucket ${this.bucket}:`, createError);
          // Don't throw - let first upload attempt handle the error
        }
      } else {
        // Other error (permission denied, etc.)
        logger.warn(`Could not verify bucket ${this.bucket}:`, error.message);
        // Don't throw - let first upload attempt handle the error
      }
    }
  }

  /**
   * Upload file to storage
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
   * Upload a buffer to storage (useful for generated files like PDFs, images)
   */
  async uploadBuffer(
    buffer: Buffer,
    filename: string,
    contentType: string,
    folder?: string
  ): Promise<FileUploadResult> {
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
      const putObjectParams: any = {
        Bucket: this.bucket,
        Key: key,
        Body: buffer,
        ContentType: contentType,
      };

      // Set public-read ACL
      putObjectParams.ACL = 'public-read';

      const command = new PutObjectCommand(putObjectParams);
      await this.s3Client.send(command);

      // Generate public URL
      const url = this.getPublicUrl(key);

      logger.info(`Buffer uploaded successfully: ${key}`);

      return {
        filename: finalFilename,
        key,
        url,
        size: buffer.length,
        mimetype: contentType,
        bucket: this.bucket,
      };
    } catch (error) {
      logger.error('Failed to upload buffer:', error);
      throw new Error(`Buffer upload failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
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
    // Always use our authenticated storage route instead of direct MinIO URLs
    const baseUrl = env.API_BASE_URL || `http://localhost:${env.PORT}`;
    return `${baseUrl}/storage/${env.STORAGE_BUCKET || 'stock-pos-storage'}/${key}`;
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
        metadata: response.Metadata || {},
      };
    } catch (error: any) {
      if (error.name === 'NotFound' || error.$metadata?.httpStatusCode === 404) {
        return null;
      }
      throw error;
    }
  }

  /**
   * List files in a folder/prefix
   */
  async listFiles(prefix?: string): Promise<StorageFileObject[]> {
    const items: StorageFileObject[] = [];
    let continuationToken: string | undefined;

    do {
      const response = await this.s3Client.send(
        new ListObjectsV2Command({
          Bucket: this.bucket,
          Prefix: prefix,
          ContinuationToken: continuationToken,
        })
      );

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
  async downloadFileBuffer(key: string): Promise<Buffer> {
    try {
      const response = await this.s3Client.send(
        new GetObjectCommand({
          Bucket: this.bucket,
          Key: key,
        })
      );

      if (!response.Body) {
        throw new Error('Empty response body');
      }

      const bytes = await response.Body.transformToByteArray();
      return Buffer.from(bytes);
    } catch (error: any) {
      if (error.name === 'NotFound' || error.$metadata?.httpStatusCode === 404) {
        throw new Error(`File not found: ${key}`);
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
