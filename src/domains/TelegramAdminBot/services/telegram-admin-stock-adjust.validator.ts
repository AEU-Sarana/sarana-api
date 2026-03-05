import prisma from '@src/database/client';
import { UserRole } from '@src/domains/User/enums';
import type { StockAdjustDraft } from '@src/domains/TelegramAdminBot/types/telegram-admin-stock-adjust.types';
import { logger } from '@src/shared/utils/logger';

const MAX_QTY = 100000;
const ALLOWED_KEYS = new Set(['product_code', 'qty', 'reason', 'note']);

export class TelegramAdminStockAdjustValidator {
  static async validate(
    tenantId: number,
    fields: Record<string, string>,
    adminUserId: number,
    chatId: number,
    telegramUserId: number,
    warnings: string[] = []
  ): Promise<
    | { ok: true; value: Omit<StockAdjustDraft, 'draftId'> }
    | { ok: false; errors: string[]; warnings: string[] }
  > {
    const errors: string[] = [];

    const user = await prisma.user.findFirst({
      where: { userId: adminUserId, tenantId },
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
      if (!Number.isFinite(qty) || qty === 0) {
        errors.push('qty must be an integer and not 0.');
      } else if (Math.abs(qty) > MAX_QTY) {
        errors.push(`qty exceeds MAX_QTY (${MAX_QTY}).`);
      }
    }

    const reason = (fields.reason || '').trim();
    if (!reason) {
      errors.push('reason is required.');
    } else if (reason.length < 3 || reason.length > 200) {
      errors.push('reason length must be 3..200.');
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
        createdByUser: { tenantId },
      },
      select: {
        productId: true,
        productCode: true,
        productName: true,
      },
    });

    if (!product) {
      return { ok: false, errors: ['product_code not found.'], warnings };
    }

    const tStockStart = Date.now();
    const stock = await prisma.stock.findUnique({
      where: { productId: product.productId },
      select: { quantity: true },
    });
    const tStockMs = Date.now() - tStockStart;
    const currentOnHand = Number(stock?.quantity ?? 0);
    if (qty < 0 && currentOnHand + qty < 0) {
      errors.push('Not enough stock on hand for this adjustment.');
    }
    logger.info('Telegram admin stock adjust stock check', {
      productId: product.productId,
      tenantId,
      qty,
      currentOnHand,
      t_stock_check_ms: tStockMs,
    });

    if (errors.length) {
      return { ok: false, errors, warnings };
    }

    const now = Date.now();
    return {
      ok: true,
      value: {
        chatId,
        telegramUserId,
        adminUserId,
        tenantId,
        createdAt: now,
        expiresAt: now + 10 * 60 * 1000,
        productId: product.productId,
        productCode: product.productCode,
        productName: product.productName,
        qty,
        reason,
        note,
        currentOnHand,
        newOnHand: currentOnHand + qty,
        warnings,
      },
    };
  }
}
