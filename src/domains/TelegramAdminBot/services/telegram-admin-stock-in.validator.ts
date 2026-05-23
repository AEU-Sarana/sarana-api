import prisma from '@src/database/client';
import { UserRole } from '@src/domains/User/enums';
import { TelegramAdminFormatService } from './telegram-admin-format.service';
import { formatDateInPhnomPenh } from '@src/shared/utils/date-utils';
import type {
  StockInFields,
  StockInValidated,
} from '@src/domains/TelegramAdminBot/types/telegram-admin-stock-in.types';

const MAX_QTY = 100000;
const ALLOWED_KEYS = new Set([
  'product_code',
  'product',
  'qty',
  'cost',
  'price',
  'low_stock',
  'reorder',
  'expired',
  'note',
]);

export class TelegramAdminStockInValidator {
  static async validate(
    tenantId: number,
    fields: StockInFields,
    adminUserId: number,
    warnings: string[] = []
  ): Promise<
    | { ok: true; value: StockInValidated }
    | { ok: false; errors: string[]; warnings: string[] }
  > {
    const errors: string[] = [];

    const user = await prisma.user.findFirst({
      where: { userId: adminUserId },
      select: { role: true },
    });
    if (!user || user.role !== UserRole.ADMIN) {
      errors.push('Only ADMIN can use this feature.');
    }

    const unknownKeys = Object.keys(fields).filter((key) => !ALLOWED_KEYS.has(key));
    if (unknownKeys.length) {
      warnings.push(`Unknown keys ignored: ${unknownKeys.map((k) => `/${k}`).join(', ')}`);
    }

    const productCode = (fields.product_code || '').trim();
    if (!productCode) {
      errors.push('product_code is required.');
    }

    const qtyRaw = (fields.qty || '').trim();
    let qty = 0;
    if (!qtyRaw) {
      errors.push('qty is required.');
    } else {
      qty = Number.parseInt(qtyRaw, 10);
      if (!Number.isFinite(qty) || qty <= 0) {
        errors.push('qty must be an integer > 0.');
      } else if (qty > MAX_QTY) {
        errors.push(`qty exceeds MAX_QTY (${MAX_QTY}).`);
      }
    }

    const costRaw = (fields.cost || '').trim();
    const cost =
      costRaw === '' ? null : Number.parseFloat(costRaw);
    if (costRaw && (typeof cost !== 'number' || !Number.isFinite(cost) || cost < 0)) {
      errors.push('cost must be a number >= 0.');
    }

    const priceRaw = (fields.price || '').trim();
    const price =
      priceRaw === '' ? null : Number.parseFloat(priceRaw);
    if (priceRaw && (typeof price !== 'number' || !Number.isFinite(price) || price < 0)) {
      errors.push('price must be a number >= 0.');
    }

    const lowStockRaw = (fields.low_stock || '').trim();
    const lowStock =
      lowStockRaw === '' ? null : Number.parseInt(lowStockRaw, 10);
    if (lowStockRaw && (typeof lowStock !== 'number' || !Number.isFinite(lowStock) || lowStock < 0)) {
      errors.push('low_stock must be an integer >= 0.');
    }

    const reorderRaw = (fields.reorder || '').trim();
    const reorder =
      reorderRaw === '' ? null : Number.parseInt(reorderRaw, 10);
    if (reorderRaw && (typeof reorder !== 'number' || !Number.isFinite(reorder) || reorder < 0)) {
      errors.push('reorder must be an integer >= 0.');
    }

    const expiredRaw = (fields.expired || '').trim();
    let expiredAt: string | null = null;
    if (expiredRaw) {
      if (!TelegramAdminFormatService.isValidDate(expiredRaw)) {
        errors.push('expired must be in YYYY-MM-DD format.');
      } else {
        const today = formatDateInPhnomPenh(new Date(), 'yyyy-MM-dd');
        if (expiredRaw < today) {
          errors.push('expired cannot be in the past.');
        } else {
          expiredAt = expiredRaw;
        }
      }
    }

    const note = (fields.note || '').trim() || null;

    if (errors.length) {
      return { ok: false, errors, warnings };
    }

    const product = await prisma.product.findFirst({
      where: {
        productCode: { equals: productCode, mode: 'insensitive' },
        status: 'active',
        deactivatedDate: null,
      },
      select: {
        productId: true,
        productCode: true,
        productName: true,
        hasExpiry: true,
        price: true,
        lowStockThreshold: true,
        reorderPoint: true,
        lastPurchaseCost: true,
      },
    });

    if (!product) {
      return {
        ok: false,
        errors: ['product_code not found.'],
        warnings,
      };
    }

    if (product.hasExpiry && !expiredAt) {
      return {
        ok: false,
        errors: ['expired is required for this product.'],
        warnings,
      };
    }

    return {
      ok: true,
      value: {
        product: {
          productId: product.productId,
          productCode: product.productCode,
          productName: product.productName,
          hasExpiry: product.hasExpiry,
          price: product.price != null ? Number(product.price) : null,
          lowStockThreshold: product.lowStockThreshold ?? null,
          reorderPoint: product.reorderPoint ?? null,
        },
        qty,
        cost: costRaw ? cost : null,
        price: priceRaw ? price : null,
        lowStock: lowStockRaw ? lowStock : null,
        reorder: reorderRaw ? reorder : null,
        expiredAt,
        note,
        warnings,
      },
    };
  }
}
