import  prisma  from '@src/database/client';

export class TelegramAdminMessageModel {
  static async exists(requestId: string) {
    const count = await prisma.telegramAdminMessages.count({ where: { requestId } });
    return count > 0;
  }

  static async logMessage(params: {
    telegramUserId: number;
    command: string;
    requestId?: string;
    status: 'SENT' | 'FAILED';
    messageId?: number;
    errorMessage?: string;
  }) {
    return prisma.telegramAdminMessages.create({ data: params });
  }
}