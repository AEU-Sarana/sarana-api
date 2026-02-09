import crypto from 'crypto';
import  prisma  from '@src/database/client';
import { ValidationException, BusinessLogicException } from '@src/shared/exceptions';
import { auditLogService } from '@src/shared/services/audit-log.service';
import { logger } from '@src/shared/utils/logger';
import { ReceiptLinkStatus } from '@src/domains/Receipt/enums/V1/receipt-link-status.enum';

const DEFAULT_EXPIRE_MINUTES = 20;

export class ReceiptLinkService {
  static async createReceiptLink(orderId: number, currentUserId: number): Promise<{
    receipt_link_id: number;
    order_id: number;
    code: string;
    link_status: ReceiptLinkStatus;
    expires_at: Date;
    telegram_deep_link: string;
  }> {
    const order = await prisma.order.findUnique({
      where: { orderId },
      select: {
        orderId: true,
        paymentMethod: true,
        totalAmount: true,
        receiptNumber: true,
      },
    });

    if (!order) {
      throw new ValidationException('Order not found');
    }

    // Paid/completed eligibility check (adapt according to final order payment state field)
    if (!order.totalAmount || Number(order.totalAmount) <= 0) {
      throw new BusinessLogicException('Receipt link can only be generated for paid/completed orders');
    }

    const code = this.generateSecureCode();
    const expiresAt = new Date(Date.now() + DEFAULT_EXPIRE_MINUTES * 60 * 1000);

    const result = await prisma.$transaction(async (tx) => {
      // Revoke any still-active pending link for this order (regenerate behavior)
      await tx.receiptLink.updateMany({
        where: {
          orderId,
          linkStatus: ReceiptLinkStatus.PENDING,
          expiresAt: { gt: new Date() },
        },
        data: {
          linkStatus: ReceiptLinkStatus.REVOKED,
        },
      });

      const created = await tx.receiptLink.create({
        data: {
          orderId,
          code,
          linkStatus: ReceiptLinkStatus.PENDING,
          expiresAt,
          createdBy: currentUserId,
        },
      });

      return created;
    });

    await auditLogService.createAuditLog({
      userId: currentUserId,
      action: 'RECEIPT_LINK_CREATED',
      resource: 'ReceiptLink',
      entityId: result.receiptLinkId,
      details: { order_id: orderId, expires_at: expiresAt },
    });

    const botUsername = process.env.TELEGRAM_BOT_USERNAME || 'your_bot';

    return {
      receipt_link_id: result.receiptLinkId,
      order_id: result.orderId,
      code: result.code,
      link_status: result.linkStatus as ReceiptLinkStatus,
      expires_at: result.expiresAt,
      telegram_deep_link: `https://t.me/${botUsername}?start=${result.code}`,
    };
  }

  static async claimReceipt(input: {
    code: string;
    telegram_user_id: string;
    telegram_chat_id: string;
    telegram_username?: string;
  }): Promise<{
    order_id: number;
    receipt_number: string;
    link_status: ReceiptLinkStatus;
  }> {
    const now = new Date();

    const link = await prisma.receiptLink.findUnique({
      where: { code: input.code },
      include: {
        order: true,
      },
    });

    if (!link) {
      throw new ValidationException('Invalid receipt code');
    }

    if (link.linkStatus === ReceiptLinkStatus.USED) {
      throw new BusinessLogicException('This receipt code was already used');
    }

    if (link.linkStatus === ReceiptLinkStatus.REVOKED) {
      throw new BusinessLogicException('This receipt code is no longer active');
    }

    if (link.expiresAt <= now) {
      await prisma.receiptLink.update({
        where: { receiptLinkId: link.receiptLinkId },
        data: { linkStatus: ReceiptLinkStatus.EXPIRED },
      });
      throw new BusinessLogicException('Receipt code has expired');
    }

    if (!link.order || Number(link.order.totalAmount) <= 0) {
      throw new BusinessLogicException('Order is not eligible for receipt claim');
    }

    await prisma.$transaction(async (tx) => {
      await tx.receiptLink.update({
        where: { receiptLinkId: link.receiptLinkId },
        data: {
          linkStatus: ReceiptLinkStatus.USED,
          usedAt: now,
          telegramUserId: parseInt(input.telegram_user_id, 10),
          telegramChatId: parseInt(input.telegram_chat_id, 10),
          telegramUsername: input.telegram_username || null,
        },
      });
    });

    await auditLogService.createAuditLog({
      action: 'RECEIPT_LINK_CLAIMED',
      resource: 'ReceiptLink',
      entityId: link.receiptLinkId,
      details: {
        order_id: link.orderId,
        telegram_user_id: input.telegram_user_id,
      },
    });

    return {
      order_id: link.orderId,
      receipt_number: link.order.receiptNumber,
      link_status: ReceiptLinkStatus.USED,
    };
  }

  private static generateSecureCode(): string {
    return crypto.randomBytes(24).toString('base64url');
  }
}