import { ProductService } from '@src/domains/Product/services/product.service';
import { StockService } from '@src/domains/Stock/services/stock.service';
import { TelegramBotService } from '@src/domains/Telegram/services/telegram-bot.service';
import { TelegramService } from '@src/domains/Telegram/services/telegram.service';
import { TelegramAdminMessageModel } from '@src/domains/TelegramAdminBot/models/telegram-admin-message.model';
import { auditLogService } from '@src/shared/services/audit-log.service';
import { TelegramAdminCommand } from '@src/domains/TelegramAdminBot/types/telegram-admin-bot.types';

export class TelegramAdminStockService {
  static async handleProductLookup(productCode: string | undefined, adminUserId: number) {
    if (!productCode) {
      throw new Error('PRODUCT_CODE_REQUIRED');
    }

    const product = await ProductService.getProductByCode(productCode, adminUserId);
    const msg = JSON.stringify(product, null, 2);
    const config = await TelegramService.getTelegramConfig();
    if (!config) throw new Error('Telegram not configured');
    await TelegramBotService.sendMessage(config.bot_token, config.group_chat_id, msg);
    return { sent: true };
  }

  static async handleStockWrite(
    command: TelegramAdminCommand & { type: 'STOCK_WRITE' },
    text: string | undefined,
    telegramUserId: number,
    adminUserId: number
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
