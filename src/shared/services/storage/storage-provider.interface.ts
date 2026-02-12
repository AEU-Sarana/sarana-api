/**
 * Storage Provider Interface
 * 
 * Abstract interface for file storage providers.
 * Supports: MinIO, Cloudflare R2, Wasabi, AWS S3, and other S3-compatible services.
 */
export interface FileUploadResult {
  filename: string;
  key: string; // Object key/path in storage
  url: string; // Public URL to access the file
  size: number;
  mimetype: string;
  bucket: string;
}

export interface IStorageProvider {
  /**
   * Upload a file to storage
   */
  upload(
    file: Express.Multer.File,
    folder?: string,
    options?: UploadOptions
  ): Promise<FileUploadResult>;

  /**
   * Upload a buffer to storage (useful for generated files like PDFs, images)
   */
  uploadBuffer(
    buffer: Buffer,
    filename: string,
    contentType: string,
    folder?: string
  ): Promise<FileUploadResult>;

  /**
   * Delete a file from storage
   */
  delete(key: string): Promise<void>;

  /**
   * Get public URL for a file
   */
  getPublicUrl(key: string): string;

  /**
   * Check if file exists
   */
  exists(key: string): Promise<boolean>;

  /**
   * Get file metadata
   */
  getMetadata(key: string): Promise<FileMetadata | null>;

  /**
   * List files in a folder/prefix
   */
  listFiles(prefix?: string): Promise<StorageFileObject[]>;

  /**
   * Download file as buffer by key
   */
  downloadFileBuffer(key: string): Promise<Buffer>;
}

export interface UploadOptions {
  /**
   * Custom filename (without extension)
   */
  filename?: string;
  
  /**
   * Content type override
   */
  contentType?: string;
  
  /**
   * Make file publicly accessible
   */
  public?: boolean;
  
  /**
   * Additional metadata
   */
  metadata?: Record<string, string>;
}

export interface FileMetadata {
  key: string;
  size: number;
  contentType: string;
  lastModified: Date;
  etag?: string;
  metadata?: Record<string, string>;
}

export interface StorageFileObject {
  key: string;
  size: number;
  lastModified: Date;
}
