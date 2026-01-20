import { env } from '@src/shared/config/env';
import { logger } from '@src/shared/utils/logger';

// Simple in-memory blacklist (for development)
// For production, use Redis
class TokenBlacklistService {
  private blacklist: Set<string> = new Set();

  /**
   * Add token to blacklist
   */
  async blacklistToken(token: string, expiry: number): Promise<void> {
    this.blacklist.add(token);
    
    // Auto-remove after expiry
    setTimeout(() => {
      this.blacklist.delete(token);
    }, expiry * 1000);
  }

  /**
   * Check if token is blacklisted
   */
  async isTokenBlacklisted(token: string): Promise<boolean> {
    return this.blacklist.has(token);
  }

  /**
   * Clear blacklist (for testing)
   */
  async clearBlacklist(): Promise<void> {
    this.blacklist.clear();
  }
}

export const tokenBlacklistService = new TokenBlacklistService();