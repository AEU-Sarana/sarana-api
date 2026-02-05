import { Router, type IRouter, Request, Response } from 'express';
import { fileStorageService } from '@src/shared/services/file-storage.service';
import { env } from '@src/shared/config/env';
import { StorageFactory } from '@src/shared/services/storage/storage.factory';
import { logger } from '@src/shared/utils/logger';
import { authenticateToken } from '@src/shared/middleware/auth.middleware';

const router: IRouter = Router();

// Apply auth middleware only to storage routes
// Since this router is mounted at '/', we need to check the path first
router.use((req: Request, res: Response, next: any) => {
  // Only apply authentication to storage routes
  if (req.path.startsWith('/storage/')) {
    return authenticateToken(req, res, next);
  }
  // For all other routes, skip authentication
  next();
});

router.get(/^\/storage\/([^\/]+)\/(.+)$/, async (req: Request, res: Response) => {
  try {
    
    const urlPath = req.url || req.path;
    const match = urlPath.match(/^\/storage\/([^\/]+)\/(.+)$/);
    
    if (!match) {
      logger.warn('Invalid storage path:', urlPath);
      return res.status(400).json({
        success: false,
        message: 'Invalid storage path',
        code: 'STORAGE_INVALID_PATH',
      });
    }
    
    const bucket = decodeURIComponent(match[1]);
    const key = decodeURIComponent(match[2]);
    
    // Log file access with user information
    const user = req.user;
    logger.info('Serving file:', { 
      bucket, 
      key, 
      url: req.url, 
      path: req.path,
      userId: user?.userId,
      username: user?.username,
      role: user?.role
    });

    if (!bucket || !key) {
      return res.status(400).json({
        success: false,
        message: 'Invalid storage path',
        code: 'STORAGE_INVALID_PATH',
      });
    }

    // S3-compatible storage (MinIO, R2, etc.)
    const { S3Client, GetObjectCommand } = await import('@aws-sdk/client-s3');
    
    const s3Client = new S3Client({
      endpoint: env.STORAGE_ENDPOINT,
      region: env.STORAGE_REGION,
      credentials: {
        accessKeyId: env.STORAGE_ACCESS_KEY!,
        secretAccessKey: env.STORAGE_SECRET_KEY!,
      },
      forcePathStyle: true,
    });

    const command = new GetObjectCommand({
      Bucket: bucket,
      Key: key,
    });

    logger.debug('Fetching file from S3-compatible storage:', { bucket, key });
    const response = await s3Client.send(command);
    
    // Get metadata from response
    const contentType = response.ContentType || 'application/octet-stream';
    const contentLength = response.ContentLength || 0;

    // Set headers
    res.setHeader('Content-Type', contentType);
    if (contentLength > 0) {
      res.setHeader('Content-Length', contentLength.toString());
    }
    res.setHeader('Cache-Control', 'public, max-age=3600');
    res.setHeader('Access-Control-Allow-Origin', '*');
    
    // Stream the file
    if (response.Body) {
      // @ts-ignore - Body is a stream
      response.Body.pipe(res);
    } else {
      return res.status(500).json({
        success: false,
        message: 'Failed to retrieve file',
        code: 'STORAGE_RETRIEVE_FAILED',
      });
    }
  } catch (error: any) {
    logger.error('Error serving file:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to serve file',
      code: 'STORAGE_SERVE_FAILED',
    });
  }
});

export default router;
