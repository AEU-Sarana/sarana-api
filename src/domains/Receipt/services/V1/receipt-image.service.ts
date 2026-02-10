import prisma from '@src/database/client';
import { ValidationException } from '@src/shared/exceptions';
import { fileStorageService } from '@src/shared/services/file-storage.service';
import sharp from 'sharp';
import type { ReceiptData } from './receipt-canvas.renderer';

interface ReceiptImageResult {
  url: string;
  filename: string;
  key: string;
  buffer: Buffer;
}

interface ReceiptImageBufferResult {
  buffer: Buffer;
  filename: string;
}

const DEFAULT_LOGO_URL = 'https://sokly.sgp1.digitaloceanspaces.com/image-2022-07-02-164325-1656755040dyQxA.jpg';

export class ReceiptImageService {
  private static async buildReceiptJpg(orderId: number): Promise<{
    buffer: Buffer;
    receiptNumber: string;
  }> {
    const [settings, order] = await Promise.all([
      prisma.receiptSetting.findFirst(),
      prisma.order.findUnique({
        where: { orderId },
        include: { order_items: true },
      }),
    ]);

    if (!order) throw new ValidationException('Order not found');

    const { renderReceiptToPng } = await import('./receipt-canvas.renderer.js');
    const receiptData: ReceiptData = {
      storeName: settings?.storeName || 'Name',
      logoPath: settings?.logoPath || DEFAULT_LOGO_URL,
      isLogoEnabled: settings?.isLogoEnabled ?? true,
      phone: settings?.phone || '0978759989',
      address: settings?.address || 'Address',
      receiptNumber: order.receiptNumber,
      orderDate: order.orderDate,
      orderItems: order.order_items.map(item => ({
        productName: item.productName || '',
        quantity: item.quantity,
        subtotal: Number(item.subtotal)
      })),
      totalAmount: Number(order.totalAmount),
      footerNote: settings?.footerNote || undefined,
      footerEnabled: settings?.isFooterEnabled ?? true
    };

    const pngBuffer = await renderReceiptToPng(receiptData);
    const jpgBuffer = await sharp(pngBuffer)
      .jpeg({ quality: 95, mozjpeg: true })
      .toBuffer();

    return { buffer: jpgBuffer, receiptNumber: order.receiptNumber };
  }

  /**
   * Generates a receipt image for a given order.
   * Uses canvas renderer for correct Khmer text shaping.
  */
  static async generateReceiptJpg(orderId: number): Promise<ReceiptImageResult> {
    const { buffer: jpgBuffer, receiptNumber } = await this.buildReceiptJpg(orderId);
    const filename = `receipt_${receiptNumber}_${Date.now()}.jpg`;
    const result = await fileStorageService.uploadBuffer(
      jpgBuffer,
      filename,
      'image/jpeg',
      'receipts'
    );

    return {
      url: result.url,
      filename: result.filename,
      key: result.key,
      buffer: jpgBuffer,
    };
  }

  /**
   * Generates a receipt image buffer without uploading to storage.
   */
  static async generateReceiptJpgBuffer(orderId: number): Promise<ReceiptImageBufferResult> {
    const { buffer: jpgBuffer, receiptNumber } = await this.buildReceiptJpg(orderId);
    const filename = `receipt_${receiptNumber}_${Date.now()}.jpg`;
    return { buffer: jpgBuffer, filename };
  }

  /**
   * Helper method for testing font rendering.
   * Directly uses canvas renderer to generate a simple test image.
   */
  static async testGenerateJpg(displayText: string): Promise<Buffer> {
    // Generate a minimal receipt data for testing
    const testData: ReceiptData = {
      storeName: displayText,
      receiptNumber: 'TEST-001',
      orderDate: new Date(),
      orderItems: [],
      totalAmount: 0,
      footerEnabled: false
    };

    const { renderReceiptToPng } = await import('./receipt-canvas.renderer.js');
    const pngBuffer = await renderReceiptToPng(testData);

    // Convert to JPG for consistency with existing tests
    return sharp(pngBuffer).jpeg().toBuffer();
  }
}
