import prisma from '@src/database/client';
import { ValidationException } from '@src/shared/exceptions';
import { fileStorageService } from '@src/shared/services/file-storage.service';
import sharp from 'sharp';

interface ReceiptImageResult {
  url: string;
  filename: string;
  key: string;
}

export class ReceiptImageService {
  // ✅ Khmer font stack - using exact font names from installed fonts
  private static readonly FONT_FAMILY =
    '"Noto Sans Khmer", "Noto Sans Khmer Bold", Battambang, "Khmer OS", Arial, sans-serif';

  // Font for numbers (more likely to have Khmer digits support)
  private static readonly NUMBER_FONT =
    '"Noto Sans Khmer", "Noto Sans Khmer Bold", Arial, sans-serif';

  static async generateReceiptJpg(orderId: number): Promise<ReceiptImageResult> {
    const [settings, order] = await Promise.all([
      prisma.receiptSetting.findFirst(),
      prisma.order.findUnique({
        where: { orderId },
        include: { order_items: true },
      }),
    ]);

    if (!order) throw new ValidationException('Order not found');

    const storeName = settings?.storeName || 'My Store';
    const footerEnabled = settings?.isFooterEnabled ?? true;
    const footerNote = settings?.footerNote || '';

    const svgContent = this.buildReceiptSvg(
      order.receiptNumber,
      order.orderDate,
      Number(order.totalAmount),
      order.order_items,
      storeName,
      settings,
      footerNote,
      footerEnabled
    );

    // ✅ ensure utf8
    const jpgBuffer = await sharp(Buffer.from(svgContent, 'utf8'))
      .jpeg({ quality: 85 })
      .toBuffer();

    const filename = `receipt_${order.receiptNumber}_${Date.now()}.jpg`;
    const result = await fileStorageService.uploadBuffer(
      jpgBuffer,
      filename,
      'image/jpeg',
      'receipts'
    );

    return { url: result.url, filename: result.filename, key: result.key };
  }

  private static buildReceiptSvg(
    receiptNumber: string,
    orderDate: Date,
    totalAmount: number,
    orderItems: any[],
    storeName: string,
    settings: any,
    footerNote: string,
    footerEnabled: boolean
  ): string {
    const font = this.FONT_FAMILY;

    const itemsSvg = orderItems
      .map((item, index) => {
        const y = 140 + index * 26; // 조금 spacing to fit Khmer better
        const lineTotal = Number(item.subtotal).toFixed(2);
        const name = this.escapeXml(String(item.productName ?? '').substring(0, 25));

        return `
          <text x="20" y="${y}" font-family="${font}" font-size="12" fill="#333">${name}</text>
          <text x="300" y="${y}" font-family="${font}" font-size="12" fill="#333" text-anchor="end">x${item.quantity}</text>
          <text x="380" y="${y}" font-family="${font}" font-size="12" fill="#333" text-anchor="end">$${lineTotal}</text>
        `;
      })
      .join('');

    const totalY = 140 + orderItems.length * 26 + 28;
    const footerY = totalY + 40;

    // ✅ Better date formatting (string)
    const dateStr = new Date(orderDate).toLocaleString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

    const footerSvg =
      footerEnabled && footerNote
        ? `<text x="200" y="${footerY}" font-family="${font}" font-size="11" fill="#666" text-anchor="middle">${this.escapeXml(footerNote)}</text>`
        : '';

    const totalItemsHeight = orderItems.length * 26 + 200;
    const canvasHeight = Math.max(420, totalItemsHeight + 80);

    return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="400" height="${canvasHeight}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <style><![CDATA[
      text { font-family: ${font}; }
    ]]></style>
  </defs>

  <rect width="100%" height="100%" fill="white"/>

  <text x="200" y="32" font-size="18" font-weight="700" fill="#1a1a1a" text-anchor="middle">
    ${this.escapeXml(storeName)}
  </text>

  ${settings?.phone ? `
  <text x="200" y="54" font-size="11" fill="#666" text-anchor="middle">
    Phone: ${this.escapeXml(settings.phone)}
  </text>` : ''}

  ${settings?.address ? `
  <text x="200" y="70" font-size="11" fill="#666" text-anchor="middle">
    ${this.escapeXml(settings.address)}
  </text>` : ''}

  <line x1="20" y1="84" x2="380" y2="84" stroke="#ddd" stroke-width="1"/>

  <text x="20" y="106" font-size="12" fill="#333">Receipt: ${this.escapeXml(receiptNumber)}</text>
  <text x="380" y="106" font-size="12" fill="#333" text-anchor="end">${dateStr}</text>

  <line x1="20" y1="118" x2="380" y2="118" stroke="#ddd" stroke-width="1"/>

  <text x="20"  y="134" font-size="10" fill="#999">ITEM</text>
  <text x="300" y="134" font-size="10" fill="#999" text-anchor="end">QTY</text>
  <text x="380" y="134" font-size="10" fill="#999" text-anchor="end">TOTAL</text>

  ${itemsSvg}

  <line x1="20" y1="${totalY - 12}" x2="380" y2="${totalY - 12}" stroke="#ddd" stroke-width="1"/>

  <text x="20"  y="${totalY}" font-size="14" font-weight="700" fill="#1a1a1a">TOTAL</text>
  <text x="380" y="${totalY}" font-size="14" font-weight="700" fill="#1a1a1a" text-anchor="end">
    $${totalAmount.toFixed(2)}
  </text>

  ${footerSvg}

  <line x1="20" y1="${canvasHeight - 30}" x2="380" y2="${canvasHeight - 30}" stroke="#ddd" stroke-width="1"/>
  <text x="200" y="${canvasHeight - 14}" font-size="11" fill="#666" text-anchor="middle">
    Thank you for shopping!
  </text>
</svg>`;
  }

  private static escapeXml(text: string): string {
    return String(text)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }
}