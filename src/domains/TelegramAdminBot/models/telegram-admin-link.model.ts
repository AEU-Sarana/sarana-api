import prisma from '@src/database/client';

export class TelegramAdminLinkModel {
  static async findActive(telegramUserId: number, chatId: number) {
    return prisma.telegramAdminLinks.findFirst({
      where: { telegramUserId, chatId, status: 'ACTIVE' }
    });
  }

  static async touch(telegramUserId: number, chatId: number) {
    return prisma.telegramAdminLinks.updateMany({
      where: { telegramUserId, chatId, status: 'ACTIVE' },
      data: { lastSeenAt: new Date() }
    });
  }

  static async upsertActiveLink(params: {
    userId: number;
    telegramUserId: number;
    chatId: number;
  }) {
    const now = new Date();
    return prisma.telegramAdminLinks.upsert({
      where: { telegramUserId: params.telegramUserId },
      update: {
        userId: params.userId,
        chatId: params.chatId,
        status: 'ACTIVE',
        revokedAt: null,
        lastSeenAt: now,
        linkedAt: now,
      },
      create: {
        userId: params.userId,
        telegramUserId: params.telegramUserId,
        chatId: params.chatId,
        status: 'ACTIVE',
        linkedAt: now,
        lastSeenAt: now,
      },
    });
  }
}