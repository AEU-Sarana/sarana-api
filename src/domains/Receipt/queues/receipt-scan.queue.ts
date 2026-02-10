import { QueueUtil } from '@src/shared/utils/queue.util';
import { Queue } from 'bull';

export interface ReceiptScanJobData {
  orderId: number;
  receiptLinkId: number;
  receiptCode: string;
  telegramChatId: string;
  telegramUserId: string | null;
  linkStatus: string;
}

let receiptScanQueue: Queue<ReceiptScanJobData> | null = null;

export function getReceiptScanQueue(): Queue<ReceiptScanJobData> {
  if (!receiptScanQueue) {
    receiptScanQueue = QueueUtil.createQueue<ReceiptScanJobData>('receipt-scan', {
      limiter: {
        max: 20,
        duration: 1000,
      },
    });
  }
  return receiptScanQueue;
}

export async function closeReceiptScanQueue(): Promise<void> {
  if (receiptScanQueue) {
    await QueueUtil.closeQueue(receiptScanQueue);
    receiptScanQueue = null;
  }
}
