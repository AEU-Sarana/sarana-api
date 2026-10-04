"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TokenService = void 0;
const crypto_1 = __importDefault(require("crypto"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const env_1 = require("../../../../shared/config/env");
const ms_1 = __importDefault(require("ms"));
class TokenService {
    static generateAccessToken(payload) {
        const claims = {
            userId: payload.userId,
            role: payload.role,
            deviceId: payload.deviceId,
            jti: crypto_1.default.randomUUID(),
            iat: Math.floor(Date.now() / 1000),
        };
        return jsonwebtoken_1.default.sign(claims, env_1.env.JWT_SECRET, {
            expiresIn: env_1.env.JWT_V2_ACCESS_TOKEN_EXPIRY,
            issuer: env_1.env.JWT_ISSUER,
            audience: env_1.env.JWT_AUDIENCE,
            subject: String(payload.userId),
        });
    }
    static generateOpaqueRefreshToken() {
        return crypto_1.default.randomBytes(32).toString('base64url');
    }
    static hashRefreshToken(raw) {
        return crypto_1.default.createHash('sha256').update(raw).digest('hex');
    }
    static getAccessTokenTtlSeconds() {
        const expiry = env_1.env.JWT_V2_ACCESS_TOKEN_EXPIRY;
        const milliseconds = (0, ms_1.default)(expiry);
        if (!milliseconds || milliseconds <= 0) {
            throw new Error(`Invalid JWT_V2_ACCESS_TOKEN_EXPIRY value: ${expiry}`);
        }
        return Math.floor(milliseconds / 1000);
    }
}
exports.TokenService = TokenService;
//# sourceMappingURL=token.service.js.map