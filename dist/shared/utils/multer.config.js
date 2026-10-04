"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.fileUpload = exports.productImageUploadAny = exports.productImageUpload = void 0;
const multer_1 = __importDefault(require("multer"));
const constants_1 = require("../../shared/config/constants");
/**
 * Multer configuration for file uploads
 * Uses memory storage to work with S3-compatible storage providers
 */
const storage = multer_1.default.memoryStorage();
/**
 * File filter for image uploads
 */
const fileFilter = (req, file, cb) => {
    if (constants_1.APP_CONSTANTS.ALLOWED_IMAGE_TYPES.includes(file.mimetype)) {
        cb(null, true);
    }
    else {
        cb(new Error(`Invalid file type. Allowed types: ${constants_1.APP_CONSTANTS.ALLOWED_IMAGE_TYPES.join(', ')}`));
    }
};
/**
 * Multer instance for product image uploads
 * Accepts any field name for flexibility (image, file, photo, etc.)
 */
exports.productImageUpload = (0, multer_1.default)({
    storage,
    fileFilter,
    limits: {
        fileSize: constants_1.APP_CONSTANTS.MAX_FILE_SIZE,
        files: 1, // Only one file at a time
    },
});
/**
 * Middleware to handle single image upload with any field name
 * This allows clients to use any field name (image, file, photo, etc.)
 */
const productImageUploadAny = (req, res, next) => {
    exports.productImageUpload.any()(req, res, (err) => {
        if (err) {
            return next(err);
        }
        // Multer's .any() puts files in req.files array
        // We need to put the first file in req.file for compatibility
        if (req.files && Array.isArray(req.files) && req.files.length > 0) {
            req.file = req.files[0];
        }
        next();
    });
};
exports.productImageUploadAny = productImageUploadAny;
/**
 * Multer instance for general file uploads
 */
exports.fileUpload = (0, multer_1.default)({
    storage,
    limits: {
        fileSize: constants_1.APP_CONSTANTS.MAX_FILE_SIZE,
    },
});
//# sourceMappingURL=multer.config.js.map