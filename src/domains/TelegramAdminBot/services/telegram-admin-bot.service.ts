import { TelegramAdminParserService } from '@src/domains/TelegramAdminBot/services/telegram-admin-parser.service';
import { TelegramAdminLinksService } from '@src/domains/TelegramAdminBot/services/telegram-admin-links.service';
import { TelegramAdminMessageModel } from '@src/domains/TelegramAdminBot/models/telegram-admin-message.model';
import { ReportService } from '@src/domains/Report/services/report.service';
import { StockService } from '@src/domains/Stock/services/stock.service';
import { ProductService } from '@src/domains/Product/services/product.service';
import { TelegramBotService } from '@src/domains/Telegram/services/telegram-bot.service';
import { TelegramService } from '@src/domains/Telegram/services/telegram.service';
import { logger } from '@src/shared/utils/logger';
import { auditLogService } from '@src/shared/services/audit-log.service';
import { TelegramWebhookPayload } from '@src/domains/TelegramAdminBot/types/telegram-admin-bot.types';
import { Role } from '@src/shared/config/permissions';

export class TelegramAdminBotService {

  static async handleUpdate(update: TelegramWebhookPayload) {
    const { telegramUserId, chatId, text, callbackData } =
      TelegramAdminParserService.parse(update);

    await TelegramAdminLinksService.requireActiveLink(telegramUserId, chatId);

    const command = TelegramAdminParserService.toCommand(text, callbackData);

    if (command.type === 'REPORT') {
      const report = await ReportService.getDailyReport(
        { date: command.date! },
        telegramUserId,
        Role.ADMIN
      );
      const msg = JSON.stringify(report, null, 2);
      const config = await TelegramService.getTelegramConfig();
      if (!config) throw new Error('Telegram not configured');
      await TelegramBotService.sendMessage(config.bot_token, config.group_chat_id, msg);
      await TelegramAdminMessageModel.logMessage({
        telegramUserId,
        command: text || 'report',
        status: 'SENT'
      });
      return { sent: true };
    }

    if (command.type === 'LOWSTOCK') {
      const stock = await ReportService.getStockReport(
        { low_stock_only: true },
        telegramUserId
      );
      const msg = JSON.stringify(stock, null, 2);
      const config = await TelegramService.getTelegramConfig();
      if (!config) throw new Error('Telegram not configured');
      await TelegramBotService.sendMessage(config.bot_token, config.group_chat_id, msg);
      return { sent: true };
    }

    if (command.type === 'PRODUCT_LOOKUP') {
      const product = await ProductService.getProductByCode(
        command.productCode!,
        telegramUserId
      );
      const msg = JSON.stringify(product, null, 2);
      const config = await TelegramService.getTelegramConfig();
      if (!config) throw new Error('Telegram not configured');
      await TelegramBotService.sendMessage(config.bot_token, config.group_chat_id, msg);
      return { sent: true };
    }

    if (command.type === 'STOCK_WRITE') {
      if (!command.requestId) throw new Error('REQUEST_ID_REQUIRED');
      if (await TelegramAdminMessageModel.exists(command.requestId)) {
        throw new Error('DUPLICATE_REQUEST_ID');
      }
      if (!command.productCode) throw new Error('PRODUCT_CODE_REQUIRED');
      if (!command.qty || Number.isNaN(command.qty)) throw new Error('INVALID_QUANTITY');

      const product = await ProductService.getProductByCode(
        command.productCode,
        telegramUserId
      );

      const movementType = command.movementType;
      if (!movementType) throw new Error('MOVEMENT_TYPE_REQUIRED');

      if (movementType === 'IN' || movementType === 'STOCK_IN') {
        await StockService.stockIn(
          { product_id: product.product_id, quantity: command.qty },
          telegramUserId
        );
      } else if (movementType === 'RETURN') {
        await StockService.stockReturn(
          { product_id: product.product_id, quantity: command.qty },
          telegramUserId
        );
      } else if (movementType === 'ADJUST' || movementType === 'ADJUSTMENT') {
        await StockService.stockAdjust(
          {
            product_id: product.product_id,
            quantity: command.qty,
            reason: 'TELEGRAM_ADMIN',
          },
          telegramUserId
        );
      } else if (movementType === 'OUT' || movementType === 'STOCK_OUT') {
        // Stock out requires order context; use ADJUSTMENT with negative quantity instead.
        await StockService.stockAdjust(
          {
            product_id: product.product_id,
            quantity: -Math.abs(command.qty),
            reason: 'TELEGRAM_ADMIN_STOCK_OUT',
          },
          telegramUserId
        );
      } else {
        throw new Error('INVALID_MOVEMENT_TYPE');
      }
      await TelegramAdminMessageModel.logMessage({
        telegramUserId,
        command: text || 'stock',
        requestId: command.requestId,
        status: 'SENT'
      });
      await auditLogService.createAuditLog({
        userId: telegramUserId,
        action: 'TELEGRAM_ADMIN_STOCK_WRITE',
        resource: 'stock',
        details: { product_code: command.productCode, qty: command.qty }
      });
      return { sent: true };
    }

    logger.warn('Unknown command', { text });
    return { sent: false };
  }
  
}
