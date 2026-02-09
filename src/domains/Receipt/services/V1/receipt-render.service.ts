import  prisma  from '@src/database/client';
import { ValidationException } from '@src/shared/exceptions';
import sharp from 'sharp';
import path from 'path';

export class ReceiptRenderService {
  static async renderReceiptText(orderId: number): Promise<string> {
    const [settings, order] = await Promise.all([
      prisma.receiptSetting.findFirst(),
      prisma.order.findUnique({
        where: { orderId },
        include: {
          order_items: true,
        },
      }),
    ]);

    if (!order) {
      throw new ValidationException('Order not found');
    }

    const storeName = settings?.storeName || 'My Store';
    const footerEnabled = settings?.isFooterEnabled ?? true;
    const footerNote = settings?.footerNote || '';

    const header: string[] = [storeName];
    if (settings?.phone) header.push(`Phone: ${settings.phone}`);
    if (settings?.address) header.push(`Address: ${settings.address}`);
    if (settings?.taxId) header.push(`Tax ID: ${settings.taxId}`);

    const itemLines = order.order_items.map((item) => {
      const lineTotal = Number(item.subtotal).toFixed(2);
      return `- ${item.productName} x${item.quantity} = $${lineTotal}`;
    });

    const body = [
      `Receipt No: ${order.receiptNumber}`,
      `Date: ${order.orderDate.toISOString()}`,
      ...itemLines,
      `Total: $${Number(order.totalAmount).toFixed(2)}`,
    ];

    const footer = footerEnabled && footerNote ? [footerNote] : [];

    return [...header, '', ...body, '', ...footer].join('\n');
  }

  // Optional Phase 2 method for PDF/thermal-style rendering
  static async renderReceiptPdf(orderId: number): Promise<Buffer> {
    throw new Error('PDF rendering not implemented in Phase 1');
  }
}