import prisma from '@src/database/client';
import { ValidationException } from '@src/shared/exceptions';
import { fileStorageService } from '@src/shared/services/file-storage.service';
import sharp from 'sharp';
import { logger } from '@src/shared/utils/logger';
import type { ReceiptData } from './receipt-canvas.renderer';
import type { ReceiptQrPayload } from '@src/domains/Receipt/types/receipt-qr.types';

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
  /**
   * Resolves a logo path to either a Buffer (if storage URL) or the string URL itself.
   */
  private static async resolveLogoSource(logoPath: string | null): Promise<string | Buffer | undefined> {
    if (!logoPath || logoPath.trim() === '') return DEFAULT_LOGO_URL;

    try {
      const key = fileStorageService.extractKeyFromUrl(logoPath);
      if (key) {
        logger.info('Resolving logo from storage key', { key });
        return await fileStorageService.downloadFileBuffer(key);
      }
    } catch (error: any) {
      logger.warn('Failed to resolve logo from storage key, falling back to URL', {
        logoPath,
        error: error.message
      });
    }

    return logoPath;
  }

  private static async buildReceiptDataFromPayload(
    payload: ReceiptQrPayload,
    settings: {
      storeName?: string | null;
      logoPath?: string | null;
      isLogoEnabled?: boolean | null;
      phone?: string | null;
      address?: string | null;
      footerNote?: string | null;
      isFooterEnabled?: boolean | null;
    }
  ): Promise<ReceiptData> {
    const logoSource = await this.resolveLogoSource(settings.logoPath || null);

    return {
      storeName: payload.store_name || settings.storeName || 'Name',
      logoSource,
      isLogoEnabled: settings.isLogoEnabled ?? true,
      phone: payload.phone || settings.phone || '0978759989',
      address: payload.address || settings.address || 'Address',
      receiptNumber: payload.receipt_number,
      orderDate: new Date(payload.order_date),
      orderItems: payload.items.map(item => ({
        productName: item.product_name,
        quantity: item.qty,
        subtotal: Number(item.subtotal),
      })),
      totalAmount: Number(payload.total_amount),
      taxAmount: payload.tax_amount ? Number(payload.tax_amount) : undefined,
      discountAmount: payload.discount_amount ? Number(payload.discount_amount) : undefined,
      serviceFee: payload.service_fee ? Number(payload.service_fee) : undefined,
      footerNote: payload.footer_note || settings.footerNote || undefined,
      footerEnabled: settings.isFooterEnabled ?? true,
    };
  }
  private static async buildReceiptJpg(orderId: number): Promise<{
    buffer: Buffer;
    receiptNumber: string;
  }> {
    const [settings, order] = await Promise.all([
      prisma.receiptSetting.findFirst({
        orderBy: { updatedAt: 'desc' }
      }),
      prisma.order.findUnique({
        where: { orderId },
        include: { order_items: true },
      }),
    ]);

    if (!order) throw new ValidationException('Order not found');

    const logoSource = await this.resolveLogoSource(settings?.logoPath || null);

    const { renderReceiptToPng } = await import('./receipt-canvas.renderer.js');
    const receiptData: ReceiptData = {
      storeName: settings?.storeName || 'Name',
      logoSource,
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
      taxAmount: Number(order.taxAmount || 0),
      discountAmount: Number(order.discountAmount || 0),
      serviceFee: Number(order.serviceFee || 0),
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
   * Generates a receipt image from offline QR payload and uploads to storage.
   */
  static async generateReceiptJpgFromPayload(payload: ReceiptQrPayload): Promise<ReceiptImageResult> {
    const settings = await prisma.receiptSetting.findFirst({
      orderBy: { updatedAt: 'desc' }
    });
    const receiptData = await this.buildReceiptDataFromPayload(payload, {
      storeName: settings?.storeName,
      logoPath: settings?.logoPath,
      isLogoEnabled: settings?.isLogoEnabled,
      phone: settings?.phone,
      address: settings?.address,
      footerNote: settings?.footerNote,
      isFooterEnabled: settings?.isFooterEnabled,
    });

    const { renderReceiptToPng } = await import('./receipt-canvas.renderer.js');
    const pngBuffer = await renderReceiptToPng(receiptData);
    const jpgBuffer = await sharp(pngBuffer)
      .jpeg({ quality: 95, mozjpeg: true })
      .toBuffer();

    const filename = `receipt_${payload.receipt_number}_${Date.now()}.jpg`;
    const result = await fileStorageService.uploadBuffer(
      jpgBuffer,
      filename,
      'image/jpeg',
      'receipts'
    );

    return { url: result.url, filename: result.filename, key: result.key, buffer: jpgBuffer };
  }

  /**
   * Helper method for testing font rendering.
   * Directly uses canvas renderer to generate a simple test image.
   */
  static async testGenerateJpg(displayText: string): Promise<Buffer> {
    // Generate a minimal receipt data for testing
    const testData: ReceiptData = {
      storeName: displayText,
      logoSource: DEFAULT_LOGO_URL,
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
