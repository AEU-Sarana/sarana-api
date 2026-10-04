"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.tokenBlacklistService = void 0;
class TokenBlacklistService {
    constructor() {
        this.blacklist = new Set();
        this.jtiBlacklist = new Set();
    }
    /**
     * Add token to blacklist
     */
    async blacklistToken(token, expiry) {
        this.blacklist.add(token);
        // Auto-remove after expiry
        setTimeout(() => {
            this.blacklist.delete(token);
        }, expiry * 1000);
    }
    /**
     * Check if token is blacklisted
     */
    async isTokenBlacklisted(token) {
        return this.blacklist.has(token);
    }
    /**
     * Blacklist a token identifier (jti) for given expiry seconds
     */
    async blacklistJti(jti, expiry) {
        this.jtiBlacklist.add(jti);
        // Auto-remove after expiry
        setTimeout(() => {
            this.jtiBlacklist.delete(jti);
        }, expiry * 1000);
    }
    /**
     * Check if a jti is blacklisted
     */
    async isJtiBlacklisted(jti) {
        return this.jtiBlacklist.has(jti);
    }
    /**
     * Clear blacklist (for testing)
     */
    async clearBlacklist() {
        this.blacklist.clear();
    }
    async clearJtiBlacklist() {
        this.jtiBlacklist.clear();
    }
}
exports.tokenBlacklistService = new TokenBlacklistService();
//# sourceMappingURL=token-blacklist.service.js.map