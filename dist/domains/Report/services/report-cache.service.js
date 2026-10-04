"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReportCacheService = void 0;
class ReportCacheService {
    static async getCached(key) {
        const item = this.cache[key];
        if (!item)
            return null;
        if (Date.now() > item.expiresAt) {
            // Expired
            delete this.cache[key];
            return null;
        }
        return item.data;
    }
    static async setCached(key, data, ttlSeconds) {
        const expiresAt = Date.now() + ttlSeconds * 1000;
        this.cache[key] = { data, expiresAt };
    }
    static async clearCache(key) {
        if (key) {
            delete this.cache[key];
        }
        else {
            this.cache = {};
        }
    }
    static async clearTenantCache(tenantId) {
        const prefix = `tenant:${tenantId}:`;
        Object.keys(this.cache).forEach(key => {
            if (key.startsWith(prefix)) {
                delete this.cache[key];
            }
        });
    }
}
exports.ReportCacheService = ReportCacheService;
ReportCacheService.cache = {};
//# sourceMappingURL=report-cache.service.js.map