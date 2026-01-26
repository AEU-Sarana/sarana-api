import multer from 'multer';
import type { Request, Response, NextFunction } from 'express';
import { APP_CONSTANTS } from '@src/shared/config/constants';

/**
 * Multer configuration for file uploads
 * Uses memory storage to work with S3-compatible storage providers
 */
const storage = multer.memoryStorage();

/**
 * File filter for image uploads
 */
const fileFilter = (
  req: Express.Request,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback
) => {
  if (APP_CONSTANTS.ALLOWED_IMAGE_TYPES.includes(file.mimetype as any)) {
    cb(null, true);
  } else {
    cb(
      new Error(
        `Invalid file type. Allowed types: ${APP_CONSTANTS.ALLOWED_IMAGE_TYPES.join(', ')}`
      )
    );
  }
};

/**
 * Multer instance for product image uploads
 * Accepts any field name for flexibility (image, file, photo, etc.)
 */
export const productImageUpload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: APP_CONSTANTS.MAX_FILE_SIZE,
    files: 1, // Only one file at a time
  },
});

/**
 * Middleware to handle single image upload with any field name
 * This allows clients to use any field name (image, file, photo, etc.)
 */
export const productImageUploadAny = (req: Request, res: Response, next: NextFunction) => {
  productImageUpload.any()(req as any, res, (err) => {
    if (err) {
      return next(err);
    }
    
    // Multer's .any() puts files in req.files array
    // We need to put the first file in req.file for compatibility
    if (req.files && Array.isArray(req.files) && req.files.length > 0) {
      (req as any).file = req.files[0];
    }
    
    next();
  });
};

/**
 * Multer instance for general file uploads
 */
export const fileUpload = multer({
  storage,
  limits: {
    fileSize: APP_CONSTANTS.MAX_FILE_SIZE,
  },
});