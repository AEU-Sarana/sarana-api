"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RefreshTokenRepository = void 0;
const client_1 = __importDefault(require("../../../../database/client"));
class RefreshTokenRepository {
    async createSession(input) {
        return client_1.default.refreshToken.create({
            data: {
                userId: input.userId,
                refreshTokenHash: input.refreshTokenHash,
                tokenFamilyId: input.tokenFamilyId,
                parentTokenId: input.parentTokenId ?? null,
                deviceId: input.deviceId ?? null,
                absoluteExpiresAt: input.absoluteExpiresAt,
                idleExpiresAt: input.idleExpiresAt,
                ipAddress: input.ipAddress ?? null,
                userAgent: input.userAgent ?? null,
            },
        });
    }
    async findByTokenHash(refreshTokenHash) {
        return client_1.default.refreshToken.findUnique({
            where: { refreshTokenHash },
            include: {
                user: {
                    select: {
                        userId: true,
                        username: true,
                        role: true,
                        status: true,
                    },
                },
            },
        });
    }
    async rotateToken(tx, input) {
        await tx.refreshToken.update({
            where: { id: input.currentSessionId },
            data: { revokedAt: new Date(), lastUsedAt: new Date() },
        });
        return tx.refreshToken.create({
            data: {
                userId: input.userId,
                refreshTokenHash: input.newRefreshTokenHash,
                tokenFamilyId: input.tokenFamilyId,
                parentTokenId: input.currentSessionId,
                absoluteExpiresAt: input.absoluteExpiresAt,
                idleExpiresAt: input.nextIdleExpiresAt,
                lastUsedAt: new Date(),
                deviceId: input.deviceId ?? null,
                ipAddress: input.ipAddress ?? null,
                userAgent: input.userAgent ?? null,
            },
        });
    }
    async revokeSession(sessionId) {
        return client_1.default.refreshToken.updateMany({
            where: { id: sessionId, revokedAt: null },
            data: { revokedAt: new Date() },
        });
    }
    async revokeFamily(tokenFamilyId) {
        return client_1.default.refreshToken.updateMany({
            where: { tokenFamilyId, revokedAt: null },
            data: { revokedAt: new Date() },
        });
    }
    async revokeAllForUser(userId) {
        return client_1.default.refreshToken.updateMany({
            where: { userId, revokedAt: null },
            data: { revokedAt: new Date() },
        });
    }
}
exports.RefreshTokenRepository = RefreshTokenRepository;
//# sourceMappingURL=refresh-token.repository.js.map