
interface CacheItem {
  data: any;
  expiresAt: number;
}

export class ReportCacheService {
  private static cache: Record<string, CacheItem> = {};

  static async getCached(key: string): Promise<any | null> {
    const item = this.cache[key];
    if (!item) return null;

    if (Date.now() > item.expiresAt) {
      // Expired
      delete this.cache[key];
      return null;
    }

    return item.data;
  }

  static async setCached(key: string, data: any, ttlSeconds: number): Promise<void> {
    const expiresAt = Date.now() + ttlSeconds * 1000;
    this.cache[key] = { data, expiresAt };
  }

  static async clearCache(key?: string) {
    if (key) {
      delete this.cache[key];
    } else {
      this.cache = {};
    }
  }

  static async clearTenantCache(tenantId: number) {
    const prefix = `tenant:${tenantId}:`;
    Object.keys(this.cache).forEach(key => {
      if (key.startsWith(prefix)) {
        delete this.cache[key];
      }
    });
  }
}
