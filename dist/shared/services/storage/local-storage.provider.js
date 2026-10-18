"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.LocalStorageProvider = void 0;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const env_1 = require("../../../shared/config/env");
const logger_1 = require("../../../shared/utils/logger");
const helpers_1 = require("../../../shared/utils/helpers");
/**
 * Local Storage Provider
 *
 * Saves and serves files directly from the local disk.
 * Ideal for local development and offline setups without third-party dependencies.
 */
class LocalStorageProvider {
    constructor() {
        this.baseDir = path_1.default.resolve(process.cwd(), 'uploads');
        if (!fs_1.default.existsSync(this.baseDir)) {
            fs_1.default.mkdirSync(this.baseDir, { recursive: true });
        }
    }
    getBaseUrl() {
        let baseUrl = env_1.env.API_BASE_URL || env_1.env.APP_URL;
        if (!baseUrl) {
            const protocol = env_1.env.STORAGE_USE_SSL ? 'https' : 'http';
            const networkIP = (0, helpers_1.getLocalNetworkIP)();
            const host = process.env.API_HOST || networkIP || 'localhost';
            const port = env_1.env.PORT || 3001;
            baseUrl = `${protocol}://${host}:${port}`;
        }
        return baseUrl.replace(/\/$/, '');
    }
    async upload(file, folder, options) {
        return this.uploadBuffer(file.buffer, options?.filename || file.originalname, options?.contentType || file.mimetype, folder);
    }
    async uploadBuffer(buffer, filename, contentType, folder) {
        const ext = path_1.default.extname(filename) || (contentType.includes('png') ? '.png' : '.jpg');
        const baseName = path_1.default.basename(filename, ext).replace(/[^a-zA-Z0-9_-]/g, '_');
        const timestamp = Date.now();
        const safeFilename = `${baseName}_${timestamp}${ext}`;
        const targetDir = folder ? path_1.default.join(this.baseDir, folder) : this.baseDir;
        if (!fs_1.default.existsSync(targetDir)) {
            fs_1.default.mkdirSync(targetDir, { recursive: true });
        }
        const filePath = path_1.default.join(targetDir, safeFilename);
        await fs_1.default.promises.writeFile(filePath, buffer);
        const key = folder ? `${folder}/${safeFilename}` : safeFilename;
        const url = `${this.getBaseUrl()}/uploads/${key}`;
        logger_1.logger.info(`File uploaded to local storage successfully: ${key}`);
        return {
            filename: safeFilename,
            key,
            url,
            size: buffer.length,
            mimetype: contentType,
            bucket: 'local',
        };
    }
    async delete(key) {
        try {
            const filePath = path_1.default.join(this.baseDir, key);
            if (fs_1.default.existsSync(filePath)) {
                await fs_1.default.promises.unlink(filePath);
                logger_1.logger.info(`File deleted from local storage: ${key}`);
            }
        }
        catch (error) {
            logger_1.logger.error(`Failed to delete local file ${key}:`, error);
        }
    }
    getPublicUrl(key) {
        return `${this.getBaseUrl()}/uploads/${key}`;
    }
    async exists(key) {
        const filePath = path_1.default.join(this.baseDir, key);
        return fs_1.default.existsSync(filePath);
    }
    async getMetadata(key) {
        try {
            const filePath = path_1.default.join(this.baseDir, key);
            const stat = await fs_1.default.promises.stat(filePath);
            return {
                key,
                size: stat.size,
                contentType: 'application/octet-stream',
                lastModified: stat.mtime,
            };
        }
        catch {
            return null;
        }
    }
    async listFiles(prefix) {
        const dir = prefix ? path_1.default.join(this.baseDir, prefix) : this.baseDir;
        if (!fs_1.default.existsSync(dir))
            return [];
        try {
            const entries = await fs_1.default.promises.readdir(dir, { withFileTypes: true });
            const results = [];
            for (const entry of entries) {
                if (entry.isFile()) {
                    const filePath = path_1.default.join(dir, entry.name);
                    const stat = await fs_1.default.promises.stat(filePath);
                    results.push({
                        key: prefix ? `${prefix}/${entry.name}` : entry.name,
                        size: stat.size,
                        lastModified: stat.mtime,
                    });
                }
            }
            return results;
        }
        catch (err) {
            logger_1.logger.error('Failed to list local storage files:', err);
            return [];
        }
    }
    async downloadFileBuffer(key) {
        const filePath = path_1.default.join(this.baseDir, key);
        return fs_1.default.promises.readFile(filePath);
    }
}
exports.LocalStorageProvider = LocalStorageProvider;
//# sourceMappingURL=local-storage.provider.js.map