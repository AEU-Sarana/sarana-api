import fs from 'fs';
import path from 'path';
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

/**
 * Local Storage Provider
 *
 * Saves and serves files directly from the local disk.
 * Ideal for local development and offline setups without third-party dependencies.
 */
export class LocalStorageProvider implements IStorageProvider {
  private baseDir: string;

  constructor() {
    this.baseDir = path.resolve(process.cwd(), 'uploads');
    if (!fs.existsSync(this.baseDir)) {
      fs.mkdirSync(this.baseDir, { recursive: true });
    }
  }

  private getBaseUrl(): string {
    let baseUrl = env.API_BASE_URL || env.APP_URL;
    if (!baseUrl) {
      const protocol = env.STORAGE_USE_SSL ? 'https' : 'http';
      const networkIP = getLocalNetworkIP();
      const host = process.env.API_HOST || networkIP || 'localhost';
      const port = env.PORT || 3001;
      baseUrl = `${protocol}://${host}:${port}`;
    }
    return baseUrl.replace(/\/$/, '');
  }

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

  async uploadBuffer(
    buffer: Buffer,
    filename: string,
    contentType: string,
    folder?: string
  ): Promise<FileUploadResult> {
    const ext = path.extname(filename) || (contentType.includes('png') ? '.png' : '.jpg');
    const baseName = path.basename(filename, ext).replace(/[^a-zA-Z0-9_-]/g, '_');
    const timestamp = Date.now();
    const safeFilename = `${baseName}_${timestamp}${ext}`;

    const targetDir = folder ? path.join(this.baseDir, folder) : this.baseDir;
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }

    const filePath = path.join(targetDir, safeFilename);
    await fs.promises.writeFile(filePath, buffer);

    const key = folder ? `${folder}/${safeFilename}` : safeFilename;
    const url = `${this.getBaseUrl()}/uploads/${key}`;

    logger.info(`File uploaded to local storage successfully: ${key}`);

    return {
      filename: safeFilename,
      key,
      url,
      size: buffer.length,
      mimetype: contentType,
      bucket: 'local',
    };
  }

  async delete(key: string): Promise<void> {
    try {
      const filePath = path.join(this.baseDir, key);
      if (fs.existsSync(filePath)) {
        await fs.promises.unlink(filePath);
        logger.info(`File deleted from local storage: ${key}`);
      }
    } catch (error: any) {
      logger.error(`Failed to delete local file ${key}:`, error);
    }
  }

  getPublicUrl(key: string): string {
    return `${this.getBaseUrl()}/uploads/${key}`;
  }

  async exists(key: string): Promise<boolean> {
    const filePath = path.join(this.baseDir, key);
    return fs.existsSync(filePath);
  }

  async getMetadata(key: string): Promise<FileMetadata | null> {
    try {
      const filePath = path.join(this.baseDir, key);
      const stat = await fs.promises.stat(filePath);
      return {
        key,
        size: stat.size,
        contentType: 'application/octet-stream',
        lastModified: stat.mtime,
      };
    } catch {
      return null;
    }
  }

  async listFiles(prefix?: string): Promise<StorageFileObject[]> {
    const dir = prefix ? path.join(this.baseDir, prefix) : this.baseDir;
    if (!fs.existsSync(dir)) return [];
    try {
      const entries = await fs.promises.readdir(dir, { withFileTypes: true });
      const results: StorageFileObject[] = [];
      for (const entry of entries) {
        if (entry.isFile()) {
          const filePath = path.join(dir, entry.name);
          const stat = await fs.promises.stat(filePath);
          results.push({
            key: prefix ? `${prefix}/${entry.name}` : entry.name,
            size: stat.size,
            lastModified: stat.mtime,
          });
        }
      }
      return results;
    } catch (err) {
      logger.error('Failed to list local storage files:', err);
      return [];
    }
  }

  async downloadFileBuffer(key: string): Promise<Buffer> {
    const filePath = path.join(this.baseDir, key);
    return fs.promises.readFile(filePath);
  }
}
