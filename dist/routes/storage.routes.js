"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const env_1 = require("../shared/config/env");
const logger_1 = require("../shared/utils/logger");
const router = (0, express_1.Router)();
router.get(/(?:^\/storage|.*\/storage)\/([^\/]+)\/(.+)$/, async (req, res) => {
    try {
        const urlPath = req.url || req.path;
        const match = urlPath.match(/(?:^\/storage|.*\/storage)\/([^\/]+)\/(.+)$/);
        if (!match) {
            logger_1.logger.warn('Invalid storage path:', urlPath);
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
        logger_1.logger.info('Serving file:', {
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
            endpoint: env_1.env.STORAGE_ENDPOINT,
            region: env_1.env.STORAGE_REGION,
            credentials: {
                accessKeyId: env_1.env.STORAGE_ACCESS_KEY,
                secretAccessKey: env_1.env.STORAGE_SECRET_KEY,
            },
            forcePathStyle: true,
        });
        const command = new GetObjectCommand({
            Bucket: bucket,
            Key: key,
        });
        logger_1.logger.debug('Fetching file from S3-compatible storage:', { bucket, key });
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
        res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
        // Stream the file
        if (response.Body) {
            // @ts-ignore - Body is a stream
            response.Body.pipe(res);
        }
        else {
            return res.status(500).json({
                success: false,
                message: 'Failed to retrieve file',
                code: 'STORAGE_RETRIEVE_FAILED',
            });
        }
    }
    catch (error) {
        logger_1.logger.error('Error serving file:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to serve file',
            code: 'STORAGE_SERVE_FAILED',
        });
    }
});
exports.default = router;
//# sourceMappingURL=storage.routes.js.map