import multer from 'multer';
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
 * Multer instance for general file uploads
 */
export const fileUpload = multer({
  storage,
  limits: {
    fileSize: APP_CONSTANTS.MAX_FILE_SIZE,
  },
});

