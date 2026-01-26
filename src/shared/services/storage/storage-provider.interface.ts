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
}

