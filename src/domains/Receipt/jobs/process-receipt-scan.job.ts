import type { Job } from 'bull';
import prisma from '@src/database/client';
import { logger } from '@src/shared/utils/logger';
import { ReceiptDeliveryService } from '@src/domains/Receipt/services/V1/receipt-delivery.service';
import type { ReceiptScanJobData } from '@src/domains/Receipt/queues/receipt-scan.queue';

export async function processReceiptScanJob(
  job: Job<ReceiptScanJobData>
): Promise<void> {
  const payload = job.data;
  const jobId = job.id ? String(job.id) : 'unknown';

  try {
    const delivery = await ReceiptDeliveryService.sendReceiptIdempotent(
      payload.orderId,
      BigInt(payload.telegramChatId),
      {
        receiptLinkId: payload.receiptLinkId,
        receiptCode: payload.receiptCode,
      }
    );

    if (payload.linkStatus === 'PENDING') {
      await prisma.receiptLink.update({
        where: { receiptLinkId: payload.receiptLinkId },
        data: {
          linkStatus: 'USED',
          usedAt: new Date(),
          telegramChatId: BigInt(payload.telegramChatId),
          telegramUserId: payload.telegramUserId ? BigInt(payload.telegramUserId) : null,
        },
      });
    }

    if (delivery.alreadySent) {
      logger.info('Receipt already sent (job)', {
        jobId,
        orderId: payload.orderId,
        receiptLinkId: payload.receiptLinkId,
      });
    }
  } catch (error: any) {
    if (error?.message === 'BOT_BLOCKED') {
      logger.warn('Receipt send blocked by bot (job)', {
        jobId,
        orderId: payload.orderId,
        receiptLinkId: payload.receiptLinkId,
      });
      return;
    }
    logger.error('Receipt scan job failed', {
      jobId,
      orderId: payload.orderId,
      receiptLinkId: payload.receiptLinkId,
      error: error?.message,
    });
    throw error;
  }
}
