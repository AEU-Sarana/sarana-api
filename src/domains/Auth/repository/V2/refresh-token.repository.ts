import prisma from '@src/database/client';

/**
 * Tx type MUST match the prisma instance you use in app.
 * (Works with PrismaPg adapter / $extends / dynamic client)
 */
type TransactionFn = Extract<
  typeof prisma.$transaction,
  (fn: (tx: any) => any, ...args: any[]) => any
>;

export type Tx = Parameters<TransactionFn>[0] extends (tx: infer T) => any ? T : never;

export class RefreshTokenRepository {
  async createSession(input: {
    userId: number;
    refreshTokenHash: string;
    tokenFamilyId: string;
    parentTokenId?: number | null;
    deviceId?: string | null;
    absoluteExpiresAt: Date;
    idleExpiresAt: Date;
    ipAddress?: string | null;
    userAgent?: string | null;
  }) {
    return prisma.refreshToken.create({
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

  async findByTokenHash(refreshTokenHash: string) {
    return prisma.refreshToken.findUnique({
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

  async rotateToken(
    tx: Tx,
    input: {
      currentSessionId: number;
      userId: number;
      newRefreshTokenHash: string;
      tokenFamilyId: string;
      absoluteExpiresAt: Date;
      nextIdleExpiresAt: Date;
      deviceId?: string | null;
      ipAddress?: string | null;
      userAgent?: string | null;
    }
  ) {
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

  async revokeSession(sessionId: number) {
    return prisma.refreshToken.updateMany({
      where: { id: sessionId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  async revokeFamily(tokenFamilyId: string) {
    return prisma.refreshToken.updateMany({
      where: { tokenFamilyId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  async revokeAllForUser(userId: number) {
    return prisma.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }
}