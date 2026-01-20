import fs from 'fs/promises';
import path from 'path';
import { APP_CONSTANTS } from '@src/shared/config/constants';
import { logger } from '@src/shared/utils/logger';
import type multer from 'multer';

export interface FileUploadResult {
  filename: string;
  path: string;
  size: number;
  mimetype: string;
}

export class FileStorageService {
  private uploadDir: string;

  constructor() {
    this.uploadDir = path.join(process.cwd(), 'storage', 'uploads');
    this.ensureUploadDir();
  }

  private async ensureUploadDir(): Promise<void> {
    try {
      await fs.mkdir(this.uploadDir, { recursive: true });
    } catch (error) {
      logger.error('Failed to create upload directory:', error);
    }
  }

  /**
   * Save uploaded file
   */
  async saveFile(
    file: Express.Multer.File,
    subfolder?: string
  ): Promise<FileUploadResult> {
    // Validate file size
    if (file.size > APP_CONSTANTS.MAX_FILE_SIZE) {
      throw new Error('File size exceeds maximum allowed size');
    }

    // Validate file type (for images)
    if (!APP_CONSTANTS.ALLOWED_IMAGE_TYPES.includes(file.mimetype as typeof APP_CONSTANTS.ALLOWED_IMAGE_TYPES[number])) {
      throw new Error('File type not allowed');
    }

    // Generate unique filename
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(7);
    const extension = path.extname(file.originalname);
    const filename = `${timestamp}-${randomString}${extension}`;

    // Create subfolder path
    const folderPath = subfolder
      ? path.join(this.uploadDir, subfolder)
      : this.uploadDir;
    await fs.mkdir(folderPath, { recursive: true });

    // Save file
    const filePath = path.join(folderPath, filename);
    await fs.writeFile(filePath, file.buffer);

    return {
      filename,
      path: filePath,
      size: file.size,
      mimetype: file.mimetype,
    };
  }

  /**
   * Delete file
   */
  async deleteFile(filePath: string): Promise<void> {
    try {
      await fs.unlink(filePath);
    } catch (error) {
      logger.error('Failed to delete file:', error);
    }
  }
}

export const fileStorageService = new FileStorageService();