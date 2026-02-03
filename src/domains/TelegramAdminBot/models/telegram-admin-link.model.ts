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
}
