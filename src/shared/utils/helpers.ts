import os from 'os';

/**
 * Generate random string
 */
  export function generateRandomString(length: number = 10): string {
      const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
      let result = '';
      for (let i = 0; i < length; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      return result;
  }
  
  /**
   * Deep clone object
   */
  export function deepClone<T>(obj: T): T {
    return JSON.parse(JSON.stringify(obj));
  }
  
  /**
   * Check if value is empty
   */
  export function isEmpty(value: any): boolean {
    if (value === null || value === undefined) return true;
    if (typeof value === 'string') return value.trim().length === 0;
    if (Array.isArray(value)) return value.length === 0;
    if (typeof value === 'object') return Object.keys(value).length === 0;
    return false;
  }
  
  /**
   * Pagination helper
   */
  export interface PaginationParams {
    page: number;
    limit: number;
  }
  
  export interface PaginationResult<T> {
    data: T[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  }
  
  export function paginate<T>(
    data: T[],
    page: number,
    limit: number
  ): PaginationResult<T> {
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedData = data.slice(startIndex, endIndex);
  
    return {
      data: paginatedData,
      pagination: {
        page,
        limit,
        total: data.length,
        totalPages: Math.ceil(data.length / limit),
      },
    };
  }

  /**
   * Get local network IP address
   */
  export function getLocalNetworkIP(): string | null {
      let interfaces: ReturnType<typeof os.networkInterfaces>;
      try {
        interfaces = os.networkInterfaces();
      } catch {
        return null;
      }
      
      for (const name of Object.keys(interfaces)) {
        for (const iface of interfaces[name] || []) {
          const family = iface.family as string | number;
          const isIPv4 = family === 'IPv4' || family === 4;
          if (isIPv4 && !iface.internal) {
            return iface.address;
          }
        }
      }
      
      return null;
  }