import crypto from 'crypto';
import prisma from '@src/database/client';
import { ValidationException, BusinessLogicException } from '@src/shared/exceptions';
import { auditLogService } from '@src/shared/services/audit-log.service';
import { ReceiptLinkStatus } from '@src/domains/Receipt/enums/V1/receipt-link-status.enum';

const DEFAULT_EXPIRE_MINUTES = 20;

export class ReceiptLinkService {
  static async createReceiptLink(orderId: number, currentUserId: number): Promise<{
    receipt_link_id: number;
    order_id: number;
    code: string;
    link_status: ReceiptLinkStatus;
    expires_at: Date;
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

    if (!order.totalAmount || Number(order.totalAmount) <= 0) {
      throw new BusinessLogicException('Receipt link can only be generated for paid/completed orders');
    }

    const code = this.generateSecureCode();
    const expiresAt = new Date(Date.now() + DEFAULT_EXPIRE_MINUTES * 60 * 1000);

    const result = await prisma.$transaction(async (tx) => {
      await tx.receiptLink.updateMany({
        where: {
          orderId: order.orderId,
          linkStatus: ReceiptLinkStatus.PENDING,
          expiresAt: { gt: new Date() },
        },
        data: {
          linkStatus: ReceiptLinkStatus.REVOKED,
        },
      });

      const created = await tx.receiptLink.create({
        data: {
          orderId: order.orderId,
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
      details: { order_id: order.orderId, expires_at: expiresAt },
    });

    return {
      receipt_link_id: result.receiptLinkId,
      order_id: result.orderId,
      code: result.code,
      link_status: result.linkStatus as ReceiptLinkStatus,
      expires_at: result.expiresAt,
    };
  }

  static async validateReceiptCode(code: string): Promise<{
    order_id: number;
    receipt_number: string;
    link_status: ReceiptLinkStatus;
  }> {
    const now = new Date();

    const link = await prisma.receiptLink.findUnique({
      where: { code },
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

    return {
      order_id: link.orderId,
      receipt_number: link.order.receiptNumber,
      link_status: link.linkStatus as ReceiptLinkStatus,
    };
  }

  public static generateSecureCode(): string {
    return crypto.randomBytes(24).toString('base64url');
  }
}