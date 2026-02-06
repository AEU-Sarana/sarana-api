import { formatDateInPhnomPenh } from '@src/shared/utils/date-utils';

export class TelegramAdminFormatService {
  static escapeMarkdown(text: string): string {
    return text.replace(/([_*[\]()`])/g, '\\$1');
  }

  static isValidDate(value: string): boolean {
    return /^\d{4}-\d{2}-\d{2}$/.test(value);
  }

  static buildCustomRangePrompt(
    command: 'report' | 'top' | 'slow' | 'income'
  ) {
    const examples = {
      report: '/report 2026-01-30 2026-02-04',
      top: '/top 2026-01-30 2026-02-04',
      slow: '/slow 2026-01-30 2026-02-04',
      income: '/income 2026-01-30 2026-02-04',
    };
    return `សូមបញ្ចូល ថ្ងៃចាប់ផ្តើម និង បញ្ចប់ Ex: ${examples[command]}`;
  }

  static formatStockHistoryPreview(params: {
    productCode: string;
    productName: string;
    movements: Array<{
      createdAt: Date;
      movementType: string;
      quantity: number;
      cost: number | null;
      price: number | null;
      supplier: string | null;
      reason: string | null;
      orderId: number | null;
      shiftId: number | null;
      lotId: number | null;
      createdByLabel: string;
    }>;
  }) {
    const { productCode, productName, movements } = params;

    if (!movements.length) {
      return [
        `📥 *ប្រវត្តិ Stock*`,
        `• ${this.escapeMarkdown(productCode)} - ${this.escapeMarkdown(productName)}`,
        '',
        'មិនមានប្រវត្តិ Stock ទេ។',
      ].join('\n');
    }

    const lines = movements.map((m, index) => {
      const qtySign =
        m.movementType === 'STOCK_OUT' && m.quantity > 0 ? -m.quantity : m.quantity;
      const qtyText = qtySign > 0 ? `+${qtySign}` : `${qtySign}`;
      const supplier = m.supplier ? this.escapeMarkdown(m.supplier) : '-';
      const reason = m.reason ? this.escapeMarkdown(m.reason) : '-';
      const movementType = this.escapeMarkdown(m.movementType);
      return [
        `${index + 1}) ${this.formatDateTime(m.createdAt)}`,
        `• Type: ${movementType}`,
        `• Qty: ${qtyText}`,
        `• Reason: ${reason}`,
        `• Supplier: ${supplier}`,
        `• Order ID: ${m.orderId ?? '-'}`,
        `• Shift ID: ${m.shiftId ?? '-'}`,
        `• Lot ID: ${m.lotId ?? '-'}`,
        `• By: ${this.escapeMarkdown(m.createdByLabel)}`,
      ].join('\n');
    });

    return [
      `📥 *ប្រវត្តិ Stock (20 ចុងក្រោយ)*`,
      `• ${this.escapeMarkdown(productCode)} - ${this.escapeMarkdown(productName)}`,
      '',
      ...lines,
    ].join('\n\n');
  }

  private static formatDateTime(date: Date): string {
    return formatDateInPhnomPenh(date, 'yyyy-MM-dd HH:mm');
  }

  static formatStockInSummary(draft: {
    product: { productCode: string; productName: string };
    qty: number;
    cost?: number | null;
    price?: number | null;
    lowStock?: number | null;
    reorder?: number | null;
    expiredAt?: string | null;
    note?: string | null;
    warnings?: string[];
  }) {
    const productCode = this.escapeMarkdown(draft.product.productCode);
    const productName = this.escapeMarkdown(draft.product.productName);
    const note = draft.note ? this.escapeMarkdown(draft.note) : null;

    const lines = [
      '📥 *Stock IN*',
      `• Product: ${productCode} - ${productName}`,
      `• Qty: ${draft.qty}`,
    ];

    if (draft.cost != null) {
      lines.push(`• Cost: $${Number(draft.cost).toLocaleString()}`);
    }
    if (draft.price != null) {
      lines.push(`• Price: $${Number(draft.price).toLocaleString()}`);
    }
    if (draft.lowStock != null) {
      lines.push(`• Low stock: ${draft.lowStock}`);
    }
    if (draft.reorder != null) {
      lines.push(`• Reorder point: ${draft.reorder}`);
    }
    if (draft.expiredAt) {
      lines.push(`• Expired: ${draft.expiredAt}`);
    }
    if (note) {
      lines.push(`• Note: ${note}`);
    }

    const warnings = draft.warnings?.filter(Boolean) ?? [];
    if (warnings.length) {
      lines.push('');
      lines.push('⚠️ *Warnings:*');
      warnings.forEach((warning) => {
        lines.push(`- ${this.escapeMarkdown(warning)}`);
      });
    }

    lines.push('');
    lines.push('សូមចុច Confirm ដើម្បីបញ្ជាក់។');

    return lines.join('\n');
  }

  static formatStockAdjustSummary(draft: {
    productCode: string;
    productName: string;
    qty: number;
    reason: string;
    note?: string | null;
    currentOnHand: number;
    newOnHand: number;
    warnings?: string[];
  }) {
    const productCode = this.escapeMarkdown(draft.productCode);
    const productName = this.escapeMarkdown(draft.productName);
    const reason = this.escapeMarkdown(draft.reason);
    const note = draft.note ? this.escapeMarkdown(draft.note) : null;
    const qtyText = draft.qty > 0 ? `+${draft.qty}` : `${draft.qty}`;

    const lines = [
      '✏️ *Stock Adjustment*',
      `• Product: ${productCode} - ${productName}`,
      `• Qty: ${qtyText}`,
      `• Reason: ${reason}`,
      `• Current On-hand: ${draft.currentOnHand}`,
      `• New On-hand: ${draft.newOnHand}`,
    ];

    if (note) {
      lines.push(`• Note: ${note}`);
    }

    const warnings = draft.warnings?.filter(Boolean) ?? [];
    if (warnings.length) {
      lines.push('');
      lines.push('⚠️ *Warnings:*');
      warnings.forEach((warning) => {
        lines.push(`- ${this.escapeMarkdown(warning)}`);
      });
    }

    lines.push('');
    lines.push('សូមចុច Confirm ដើម្បីបញ្ជាក់។');

    return lines.join('\n');
  }
}
