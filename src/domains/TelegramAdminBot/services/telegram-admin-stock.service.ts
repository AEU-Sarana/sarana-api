import prisma from '@src/database/client';
import { ProductService } from '@src/domains/Product/services/product.service';
import { StockService } from '@src/domains/Stock/services/stock.service';
import { TelegramBotService } from '@src/domains/Telegram/services/telegram-bot.service';
import { TelegramService } from '@src/domains/Telegram/services/telegram.service';
import { TelegramAdminMessageModel } from '@src/domains/TelegramAdminBot/models/telegram-admin-message.model';
import { auditLogService } from '@src/shared/services/audit-log.service';
import { TelegramAdminCommand } from '@src/domains/TelegramAdminBot/types/telegram-admin-bot.types';
import type { TelegramAdminCallbackResult } from '@src/domains/TelegramAdminBot/types/telegram-admin-callback.types';
import { TelegramAdminFormatService } from './telegram-admin-format.service';
import { NAV_STOCK_HISTORY } from '@src/domains/Telegram/menu/menu-registry';
import {
  clearAllRangePending,
  clearStockHistoryPending,
  getPendingKey,
  setStockHistoryPending,
  clearStockInPending,
  setStockInPending,
  saveStockInDraft,
  getStockInDraft,
  clearStockInDraft,
  clearStockAdjustPending,
  setStockAdjustPending,
  saveStockAdjustDraft,
  getStockAdjustDraft,
  clearStockAdjustDraft,
} from './telegram-admin-state.service';
import { TelegramAdminCommandBlockParserService } from './telegram-admin-command-block-parser.service';
import { TelegramAdminStockInValidator } from './telegram-admin-stock-in.validator';
import type { StockInDraft } from '@src/domains/TelegramAdminBot/types/telegram-admin-stock-in.types';
import { TelegramAdminStockAdjustValidator } from './telegram-admin-stock-adjust.validator';
import type { StockAdjustDraft } from '@src/domains/TelegramAdminBot/types/telegram-admin-stock-adjust.types';
import { randomBytes } from 'crypto';
import { StockLotService } from '@src/domains/Stock/services/stock-lot.service';
import { ProductStatus } from '@src/domains/Product/enums/product-status.enum';
import { eventBus } from '@src/shared/events/event-bus';
import { logger } from '@src/shared/utils/logger';

const STOCK_IN_DRAFT_TTL_MS = 10 * 60 * 1000;

export class TelegramAdminStockService {
  static startStockHistoryPrompt(
    chatId: number,
    telegramUserId: number
  ): TelegramAdminCallbackResult {
    const pendingKey = getPendingKey(chatId);
    clearAllRangePending(pendingKey);
    clearStockHistoryPending(chatId, telegramUserId);
    clearStockAdjustPending(chatId, telegramUserId);
    setStockHistoryPending(chatId, telegramUserId);
    return {
      text:
        'សូមបញ្ចូល Product Code ឬ Product Name :\nឧ: P001 ឬ Coca Cola\nឬ /product P001 (ឬ /product Coca Cola)\n(សរសេរ /cancel ដើម្បីបោះបង់)\nសូម Reply លើសារនេះ ដើម្បីបញ្ចូលឈ្មោះទំនិញ។',
      parseMode: 'Markdown',
      replyMarkup: {
        force_reply: true,
        selective: true,
      },
    };
  }

  static startStockInPrompt(
    chatId: number,
    telegramUserId: number
  ): TelegramAdminCallbackResult {
    const pendingKey = getPendingKey(chatId);
    clearAllRangePending(pendingKey);
    clearStockHistoryPending(chatId, telegramUserId);
    clearStockInPending(chatId, telegramUserId);
    clearStockAdjustPending(chatId, telegramUserId);
    setStockInPending(chatId, telegramUserId);

    const template = [
      '/product_code PROD-0009',
      '/qty 30',
      '/cost 20',
      '/price 25',
      '/low_stock 10',
      '/reorder 5',
      '/expired 2026-02-26',
      '/note Receiving from supplier A',
    ].join('\n');

    return {
      text: [
        'សូមអ្នកបញ្ចូលព័ត៌មានដូចខាងក្រោម (copy/paste):',
        '```',
        template,
        '```',
        'Send /cancel to stop.',
      ].join('\n'),
      parseMode: 'Markdown',
      replyMarkup: {
        inline_keyboard: [
          [
            {
              text: '⬅️ Back',
              callback_data: 'NAV_UPDATE_STOCK_ADMIN',
            },
          ],
        ],
      },
    };
  }

  static buildStockInConfirmKeyboard(draftId: string) {
    return {
      inline_keyboard: [
        [
          { text: '✅ Confirm', callback_data: `STOCK_IN_CONFIRM:${draftId}` },
          { text: '❌ Cancel', callback_data: `STOCK_IN_CANCEL:${draftId}` },
        ],
      ],
    };
  }

  static async handleStockInBlockInput(
    chatId: number,
    text: string,
    adminUserId: number,
    telegramUserId: number,
    tenantId: number
  ): Promise<TelegramAdminCallbackResult> {
    const parsed = TelegramAdminCommandBlockParserService.parseCommandBlock(text);
    logger.info('Telegram admin stock in parsed', {
      chatId,
      telegramUserId,
      fields: parsed.fields,
      warnings: parsed.warnings,
    });
    const validation = await TelegramAdminStockInValidator.validate(
      tenantId,
      parsed.fields,
      adminUserId,
      parsed.warnings
    );

    if (!validation.ok) {
      logger.warn('Telegram admin stock in validation failed', {
        chatId,
        telegramUserId,
        errors: validation.errors,
        warnings: validation.warnings,
      });
      const errorLines = [
        '❌ Invalid input:',
        ...validation.errors.map(
          (err) => `- ${TelegramAdminFormatService.escapeMarkdown(err)}`
        ),
      ];

      if (validation.warnings.length) {
        errorLines.push('');
        errorLines.push('⚠️ Warnings:');
        validation.warnings.forEach((warning) => {
          errorLines.push(`- ${TelegramAdminFormatService.escapeMarkdown(warning)}`);
        });
      }

      errorLines.push('');
      errorLines.push(
        [
          'សូមអ្នកបញ្ចូលព័ត៌មានដូចខាងក្រោម (copy/paste):',
          '`/product_code PROD-0004`',
          '`/qty 30`',
          '`/cost 20`',
          '`/price 25`',
          '`/low_stock 10`',
          '`/reorder 5`',
          '`/expired 2026-02-26` (optional)',
          '`/note Receiving from supplier A` (optional)',
          'Send /cancel to stop.',
        ].join('\n')
      );

      return {
        text: errorLines.join('\n'),
        parseMode: 'Markdown',
        replyMarkup: {
          force_reply: true,
          selective: true,
        },
      };
    }

    const draftId = this.generateDraftId();
    const draft: StockInDraft = {
      draftId,
      chatId,
      telegramUserId,
      adminUserId,
      tenantId,
      createdAt: Date.now(),
      ...validation.value,
    };

    saveStockInDraft(draft);
    clearStockInPending(chatId, telegramUserId);

    return {
      text: TelegramAdminFormatService.formatStockInSummary(draft),
      parseMode: 'Markdown',
      replyMarkup: this.buildStockInConfirmKeyboard(draftId),
    };
  }

  static async confirmStockIn(
    draftId: string,
    adminUserId: number,
    tenantId: number
  ): Promise<TelegramAdminCallbackResult> {
    const draft = getStockInDraft(draftId);
    if (!draft) {
      return { text: 'Draft not found or expired.', parseMode: 'Markdown' };
    }

    if (draft.adminUserId !== adminUserId || draft.tenantId !== tenantId) {
      return { text: 'This draft does not belong to you.', parseMode: 'Markdown' };
    }

    if (Date.now() - draft.createdAt > STOCK_IN_DRAFT_TTL_MS) {
      clearStockInDraft(draftId);
      return { text: 'Draft expired. Please start again.', parseMode: 'Markdown' };
    }

    const tStart = Date.now();
    const result = await prisma.$transaction(async (tx) => {
      const now = new Date();
      const product = await tx.product.findFirst({
        where: {
          productId: draft.product.productId,
        },
      });

      if (!product || product.deactivatedDate || product.status !== ProductStatus.ACTIVE) {
        throw new Error('Product not found or inactive');
      }

      if (product.hasExpiry && !draft.expiredAt) {
        throw new Error('Expiry date is required for this product');
      }

      let stock = await tx.stock.findUnique({
        where: { productId: draft.product.productId },
      });

      if (!stock) {
        stock = await tx.stock.create({
          data: {
            productId: draft.product.productId,
            quantity: 0,
            stockVersion: 1,
            updatedAt: now,
          },
        });
      }

      const expiredAt = draft.expiredAt
        ? new Date(`${draft.expiredAt}T00:00:00+07:00`)
        : null;

      const { movement } = await StockLotService.createLotStockIn(
        {
          productId: draft.product.productId,
          quantity: draft.qty,
          cost: draft.cost ?? null,
          supplier: null,
          receivedAt: now,
          expiredAt,
          createdBy: adminUserId,
        },
        tx
      );

      if (draft.note) {
        await tx.stockMovement.update({
          where: { movementId: movement.movementId },
          data: { reason: draft.note },
        });
      }

      const updatedStock = await tx.stock.update({
        where: { productId: draft.product.productId },
        data: {
          quantity: stock.quantity + draft.qty,
          stockVersion: stock.stockVersion + 1,
          updatedAt: now,
        },
      });

      const productUpdate: any = {
        updatedAt: now,
        updatedBy: adminUserId,
      };

      if (draft.cost != null) {
        productUpdate.lastPurchaseCost = Number(draft.cost);
      }

      if (draft.price != null) {
        productUpdate.price = draft.price;
      }
      if (draft.lowStock != null) {
        productUpdate.lowStockThreshold = draft.lowStock;
      }
      if (draft.reorder != null) {
        productUpdate.reorderPoint = draft.reorder;
      }

      const updateKeys = Object.keys(productUpdate);
      if (updateKeys.length > 2) {
        await tx.product.update({
          where: { productId: draft.product.productId },
          data: productUpdate,
        });
      }

      return { updatedStock, movement };
    });

    clearStockInDraft(draftId);

    await auditLogService.createAuditLog({
      userId: adminUserId,
      action: 'TELEGRAM_ADMIN_STOCK_IN',
      resource: 'stock',
      entityId: draft.product.productId,
      details: {
        product_code: draft.product.productCode,
        qty: draft.qty,
        cost: draft.cost ?? null,
        price: draft.price ?? null,
        low_stock: draft.lowStock ?? null,
        reorder: draft.reorder ?? null,
        expired_at: draft.expiredAt ?? null,
        note: draft.note ?? null,
      },
    });

    eventBus.emit('stock.updated', {
      product_id: draft.product.productId,
      quantity: result.updatedStock.quantity,
      stock_version: result.updatedStock.stockVersion,
      movement_type: 'STOCK_IN',
      updated_by: adminUserId,
      updated_at: result.updatedStock.updatedAt,
    });

    eventBus.emit('stock.movement.created', {
      movement_id: result.movement.movementId,
      product_id: draft.product.productId,
      movement_type: 'STOCK_IN',
      quantity: draft.qty,
      created_by: adminUserId,
      created_at: result.movement.createdAt,
    });

    logger.info('Telegram admin stock in', {
      productId: draft.product.productId,
      qty: draft.qty,
      userId: adminUserId,
      t_ms: Date.now() - tStart,
    });

    return {
      text: [
        '✅ Stock IN success',
        `• Product: ${TelegramAdminFormatService.escapeMarkdown(
          draft.product.productCode
        )} - ${TelegramAdminFormatService.escapeMarkdown(draft.product.productName)}`,
        `• Qty: ${draft.qty}`,
        `• On-hand: ${result.updatedStock.quantity}`,
      ].join('\n'),
      parseMode: 'Markdown',
    };
  }

  static cancelStockIn(draftId: string) {
    clearStockInDraft(draftId);
  }

  static startStockAdjustPrompt(
    chatId: number,
    telegramUserId: number
  ): TelegramAdminCallbackResult {
    const pendingKey = getPendingKey(chatId);
    clearAllRangePending(pendingKey);
    clearStockHistoryPending(chatId, telegramUserId);
    clearStockInPending(chatId, telegramUserId);
    clearStockAdjustPending(chatId, telegramUserId);
    setStockAdjustPending(chatId, telegramUserId);

    const template = [
      '/product_code PROD-0004',
      '/qty -5',
      '/reason Damaged',
      '/note optional',
    ].join('\n');

    return {
      text: [
        'សូមអ្នកបញ្ចូលព័ត៌មានដូចខាងក្រោម (copy/paste):',
        '```',
        template,
        '```',
        'Send /cancel to stop.',
      ].join('\n'),
      parseMode: 'Markdown',
      replyMarkup: {
        inline_keyboard: [
          [
            {
              text: '⬅️ Back',
              callback_data: 'NAV_UPDATE_STOCK_ADMIN',
            },
          ],
        ],
      },
    };
  }

  static buildStockAdjustConfirmKeyboard(draftId: string) {
    return {
      inline_keyboard: [
        [
          { text: '✅ Confirm', callback_data: `STOCK_ADJUST_CONFIRM:${draftId}` },
          { text: '❌ Cancel', callback_data: `STOCK_ADJUST_CANCEL:${draftId}` },
        ],
      ],
    };
  }

  static async handleStockAdjustBlockInput(
    chatId: number,
    text: string,
    adminUserId: number,
    telegramUserId: number,
    tenantId: number
  ): Promise<TelegramAdminCallbackResult> {
    const tParseStart = Date.now();
    const parsed = TelegramAdminCommandBlockParserService.parseCommandBlock(text);
    const tParseMs = Date.now() - tParseStart;
    logger.info('Telegram admin stock adjust parsed', {
      chatId,
      telegramUserId,
      fields: parsed.fields,
      warnings: parsed.warnings,
      t_parse_ms: tParseMs,
    });

    const tValidateStart = Date.now();
    const validation = await TelegramAdminStockAdjustValidator.validate(
      tenantId,
      parsed.fields,
      adminUserId,
      chatId,
      telegramUserId,
      parsed.warnings
    );
    const tValidateMs = Date.now() - tValidateStart;

    if (!validation.ok) {
      logger.warn('Telegram admin stock adjust validation failed', {
        chatId,
        telegramUserId,
        errors: validation.errors,
        warnings: validation.warnings,
        t_validate_ms: tValidateMs,
      });

      const errorLines = [
        '❌ Invalid input:',
        ...validation.errors.map(
          (err) => `- ${TelegramAdminFormatService.escapeMarkdown(err)}`
        ),
      ];
      if (validation.warnings.length) {
        errorLines.push('');
        errorLines.push('⚠️ Warnings:');
        validation.warnings.forEach((warning) => {
          errorLines.push(`- ${TelegramAdminFormatService.escapeMarkdown(warning)}`);
        });
      }
      errorLines.push('');
      errorLines.push(
        [
          'សូមអ្នកបញ្ចូលព័ត៌មានដូចខាងក្រោម (copy/paste):',
          '```',
          '/product_code PROD-0004',
          '/qty -5',
          '/reason Damaged',
          '/note optional',
          '```',
          'Send /cancel to stop.',
        ].join('\n')
      );

      return {
        text: errorLines.join('\n'),
        parseMode: 'Markdown',
        replyMarkup: {
          inline_keyboard: [
            [
              {
                text: '⚡ Fill Template',
                switch_inline_query_current_chat: [
                  '/product_code PROD-0004',
                  '/qty -5',
                  '/reason Damaged',
                  '/note optional',
                ].join('\n'),
              },
            ],
            [
              {
                text: '⬅️ Back',
                callback_data: 'NAV_UPDATE_STOCK_ADMIN',
              },
            ],
          ],
        },
      };
    }

    const draftId = this.generateDraftId();
    const draft: StockAdjustDraft = {
      draftId,
      ...validation.value,
    };
    saveStockAdjustDraft(draft);
    clearStockAdjustPending(chatId, telegramUserId);

    logger.info('Telegram admin stock adjust validated', {
      chatId,
      telegramUserId,
      draftId,
      t_validate_ms: tValidateMs,
    });

    return {
      text: TelegramAdminFormatService.formatStockAdjustSummary(draft),
      parseMode: 'Markdown',
      replyMarkup: this.buildStockAdjustConfirmKeyboard(draftId),
    };
  }

  static async confirmStockAdjust(
    draftId: string,
    adminUserId: number,
    tenantId: number
  ): Promise<TelegramAdminCallbackResult> {
    const draft = getStockAdjustDraft(draftId);
    if (!draft) {
      return { text: '⏱ Draft expired, please try again', parseMode: 'Markdown' };
    }

    if (draft.adminUserId !== adminUserId || draft.tenantId !== tenantId) {
      return { text: 'This draft does not belong to you.', parseMode: 'Markdown' };
    }

    if (Date.now() > draft.expiresAt) {
      clearStockAdjustDraft(draftId);
      return { text: '⏱ Draft expired, please try again', parseMode: 'Markdown' };
    }

    const admin = await prisma.user.findUnique({
      where: { userId: adminUserId },
      select: { role: true },
    });
    if (!admin || admin.role !== 'ADMIN') {
      return { text: 'Only ADMIN can use this feature.', parseMode: 'Markdown' };
    }

    const tTxStart = Date.now();
    let result: { movement: any; updatedStock: any; beforeQty: number; afterQty: number };
    try {
      result = await prisma.$transaction(async (tx) => {
        const product = await tx.product.findFirst({
          where: {
            productId: draft.productId,
          },
        });

        if (!product || product.deactivatedDate || product.status !== ProductStatus.ACTIVE) {
          throw new Error('Product not found or inactive');
        }

        let stock = await tx.stock.findUnique({
          where: { productId: draft.productId },
        });

        if (!stock) {
          stock = await tx.stock.create({
            data: {
              productId: draft.productId,
              quantity: 0,
              stockVersion: 1,
              updatedAt: new Date(),
            },
          });
        }

        const beforeQty = stock.quantity;
        const afterQty = beforeQty + draft.qty;
        if (draft.qty < 0 && afterQty < 0) {
          throw new Error('INSUFFICIENT_STOCK');
        }

        const movement = await tx.stockMovement.create({
          data: {
            productId: draft.productId,
            lotId: null,
            movementType: 'ADJUSTMENT',
            quantity: draft.qty,
            reason: draft.note ? `${draft.reason} | ${draft.note}` : draft.reason,
            createdBy: adminUserId,
            createdAt: new Date(),
          },
        });

        const updatedStock = await tx.stock.update({
          where: { productId: draft.productId },
          data: {
            quantity: afterQty,
            stockVersion: stock.stockVersion + 1,
            updatedAt: new Date(),
          },
        });

        return { movement, updatedStock, beforeQty, afterQty };
      });
    } catch (error: any) {
      logger.error('Telegram admin stock adjust commit failed', {
        productId: draft.productId,
        qty: draft.qty,
        error: error.message,
      });
      const message =
        error?.message === 'INSUFFICIENT_STOCK'
          ? 'Not enough stock on hand for this adjustment.'
          : '❌ Failed, try again';
      return { text: message, parseMode: 'Markdown' };
    }

    clearStockAdjustDraft(draftId);

    await auditLogService.createAuditLog({
      userId: adminUserId,
      action: 'TELEGRAM_ADMIN_STOCK_ADJUST',
      resource: 'stock',
      entityId: draft.productId,
      details: {
        product_code: draft.productCode,
        qty: draft.qty,
        reason: draft.reason,
        note: draft.note ?? null,
        stock_before: result.beforeQty,
        stock_after: result.afterQty,
      },
    });

    eventBus.emit('stock.updated', {
      product_id: draft.productId,
      quantity: result.updatedStock.quantity,
      stock_version: result.updatedStock.stockVersion,
      movement_type: 'ADJUSTMENT',
      updated_by: adminUserId,
      updated_at: result.updatedStock.updatedAt,
    });

    eventBus.emit('stock.movement.created', {
      movement_id: result.movement.movementId,
      product_id: draft.productId,
      movement_type: 'ADJUSTMENT',
      quantity: draft.qty,
      created_by: adminUserId,
      created_at: result.movement.createdAt,
    });

    logger.info('Telegram admin stock adjust committed', {
      productId: draft.productId,
      qty: draft.qty,
      userId: adminUserId,
      t_tx_ms: Date.now() - tTxStart,
    });

    const qtyText = draft.qty > 0 ? `+${draft.qty}` : `${draft.qty}`;
    return {
      text: [
        '✅ Adjustment success',
        `• Product: ${TelegramAdminFormatService.escapeMarkdown(draft.productCode)} - ${TelegramAdminFormatService.escapeMarkdown(draft.productName)}`,
        `• Qty: ${qtyText}`,
        `• On-hand: ${result.beforeQty} → ${result.afterQty}`,
        `• Movement ID: ${result.movement.movementId}`,
      ].join('\n'),
      parseMode: 'Markdown',
    };
  }

  static cancelStockAdjust(draftId: string) {
    clearStockAdjustDraft(draftId);
  }

  private static generateDraftId(): string {
    return randomBytes(4).toString('hex').toUpperCase();
  }

  static buildStockHistoryKeyboard(productId: number) {
    return {
      inline_keyboard: [
        [
          {
            text: '📤 Download Excel (Last 30 days)',
            callback_data: `STOCK_HISTORY_EXPORT:${productId}:30d`,
          },
        ],
        [
          {
            text: '📤 Download Excel (All)',
            callback_data: `STOCK_HISTORY_EXPORT:${productId}:all`,
          },
        ],
        [
          {
            text: '⬅️ Back',
            callback_data: NAV_STOCK_HISTORY,
          },
        ],
      ],
    };
  }

  static buildStockHistorySelectKeyboard(
    products: Array<{ productId: number; productCode: string; productName: string }>
  ) {
    const rows = products.map((p) => [
      {
        text: `${p.productCode} - ${p.productName}`,
        callback_data: `STOCK_HISTORY_SELECT:${p.productId}`,
      },
    ]);

    rows.push([{ text: '⬅️ Back', callback_data: NAV_STOCK_HISTORY }]);

    return { inline_keyboard: rows };
  }

  static async findProductsByQuery(query: string, tenantId: number) {
    const trimmed = query.trim();
    if (!trimmed) return [];

    const exactCode = await prisma.product.findFirst({
      where: {
        productCode: { equals: trimmed, mode: 'insensitive' },
        status: 'active',
      },
      select: { productId: true, productCode: true, productName: true },
    });
    if (exactCode) return [exactCode];

    const exactBarcode = await prisma.product.findFirst({
      where: {
        barcode: { equals: trimmed, mode: 'insensitive' },
        status: 'active',
      },
      select: { productId: true, productCode: true, productName: true },
    });
    if (exactBarcode) return [exactBarcode];

    return prisma.product.findMany({
      where: {
        status: 'active',
        productName: { contains: trimmed, mode: 'insensitive' },
      },
      select: { productId: true, productCode: true, productName: true },
      orderBy: { productName: 'asc' },
      take: 5,
    });
  }

  static async buildStockHistoryPreview(
    productId: number,
    tenantId: number,
    limit = 20
  ): Promise<TelegramAdminCallbackResult> {
    const product = await prisma.product.findFirst({
      where: { productId },
      select: { productId: true, productCode: true, productName: true },
    });
    if (!product) {
      return { text: 'រកមិនឃើញទំនិញ', parseMode: 'Markdown' };
    }

    const movements = await prisma.stockMovement.findMany({
      where: { productId },
      include: {
        user: { select: { username: true, fullName: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    const formatted = TelegramAdminFormatService.formatStockHistoryPreview({
      productCode: product.productCode,
      productName: product.productName,
      movements: movements.map((m) => ({
        createdAt: m.createdAt,
        movementType: m.movementType,
        quantity: m.quantity,
        cost: m.cost ? Number(m.cost) : null,
        price: m.price ? Number(m.price) : null,
        supplier: m.supplier,
        reason: m.reason,
        orderId: m.orderId,
        lotId: m.lotId,
        createdByLabel: m.user?.fullName || m.user?.username || String(m.createdBy),
      })),
    });

    return {
      text: formatted,
      parseMode: 'Markdown',
      replyMarkup: this.buildStockHistoryKeyboard(productId),
    };
  }

  static async handleProductLookup(
    productCode: string | undefined,
    adminUserId: number,
    tenantId: number
  ) {
    if (!productCode) {
      throw new Error('PRODUCT_CODE_REQUIRED');
    }

    const product = await ProductService.getProductByCode(productCode, adminUserId);
    const msg = JSON.stringify(product, null, 2);
    const config = await TelegramService.getTelegramConfig(tenantId);
    if (!config) throw new Error('Telegram not configured');
    await TelegramBotService.sendMessage(config.bot_token, config.group_chat_id, msg);
    return { sent: true };
  }

  static async handleStockWrite(
    command: TelegramAdminCommand & { type: 'STOCK_WRITE' },
    text: string | undefined,
    telegramUserId: number,
    adminUserId: number,
    tenantId: number
  ) {
    if (!command.requestId) throw new Error('REQUEST_ID_REQUIRED');
    if (await TelegramAdminMessageModel.exists(command.requestId)) {
      throw new Error('DUPLICATE_REQUEST_ID');
    }
    if (!command.productCode) throw new Error('PRODUCT_CODE_REQUIRED');
    if (!command.qty || Number.isNaN(command.qty)) throw new Error('INVALID_QUANTITY');

    const product = await ProductService.getProductByCode(command.productCode, adminUserId);

    const movementType = command.movementType;
    if (!movementType) throw new Error('MOVEMENT_TYPE_REQUIRED');

    if (movementType === 'IN' || movementType === 'STOCK_IN') {
      await StockService.stockIn(
        { product_id: product.product_id, quantity: command.qty },
        adminUserId
      );
    } else if (movementType === 'RETURN') {
      await StockService.stockReturn(
        { product_id: product.product_id, quantity: command.qty },
        adminUserId
      );
    } else if (movementType === 'ADJUST' || movementType === 'ADJUSTMENT') {
      await StockService.stockAdjust(
        {
          product_id: product.product_id,
          quantity: command.qty,
          reason: 'TELEGRAM_ADMIN',
        },
        adminUserId
      );
    } else if (movementType === 'OUT' || movementType === 'STOCK_OUT') {
      // Stock out requires order context; use ADJUSTMENT with negative quantity instead.
      await StockService.stockAdjust(
        {
          product_id: product.product_id,
          quantity: -Math.abs(command.qty),
          reason: 'TELEGRAM_ADMIN_STOCK_OUT',
        },
        adminUserId
      );
    } else {
      throw new Error('INVALID_MOVEMENT_TYPE');
    }

    await TelegramAdminMessageModel.logMessage({
      telegramUserId,
      command: text || 'stock',
      requestId: command.requestId,
      status: 'SENT',
    });
    await auditLogService.createAuditLog({
      userId: adminUserId,
      action: 'TELEGRAM_ADMIN_STOCK_WRITE',
      resource: 'stock',
      details: { product_code: command.productCode, qty: command.qty },
    });
    return { sent: true };
  }
}
