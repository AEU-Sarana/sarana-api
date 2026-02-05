import { TelegramAdminParserService } from '@src/domains/TelegramAdminBot/services/telegram-admin-parser.service';
import { TelegramAdminLinksService } from '@src/domains/TelegramAdminBot/services/telegram-admin-links.service';
import { TelegramAdminMessageModel } from '@src/domains/TelegramAdminBot/models/telegram-admin-message.model';
import { ReportService } from '@src/domains/Report/services/report.service';
import { StockService } from '@src/domains/Stock/services/stock.service';
import { InventoryReportService } from '@src/domains/Stock/services/inventory-report.service';
import { ShiftService } from '@src/domains/Shift/services/shift.service';
import { ProductService } from '@src/domains/Product/services/product.service';
import { TelegramBotService } from '@src/domains/Telegram/services/telegram-bot.service';
import { TelegramService } from '@src/domains/Telegram/services/telegram.service';
import { renderMenu } from '@src/domains/Telegram/menu/menu-renderer';
import { NAV_ROW, type MenuId } from '@src/domains/Telegram/menu/menu-registry';
import { getMenuStateKey, goHome, popMenu, pushMenu, resetStack } from '@src/domains/Telegram/menu/menu-state';
import { logger } from '@src/shared/utils/logger';
import { auditLogService } from '@src/shared/services/audit-log.service';
import { CreateTelegramAdminLinkRequest, CreateTelegramAdminLinkResponse, PendingTelegramAdminLink, TelegramWebhookPayload } from '@src/domains/TelegramAdminBot/types/telegram-admin-bot.types';
import { Role } from '@src/shared/config/permissions';
import { buildDailyAggregateReportMessage } from '@src/domains/Telegram/templates/daily-aggregate-report.template';
import { formatDate, subtractDaysFromDate, toPhnomPenhISOString } from '@src/shared/utils/date-utils';
import { UserService } from '@src/domains/User/services/user.service';
import { randomInt } from 'crypto';
import { UserRole } from '@src/domains/User/enums';
import { startOfMonth, startOfWeek, startOfYear } from 'date-fns';
import prisma from '@src/database/client';
import { Prisma } from '@src/database/generated';
import { calculateProfit } from '@src/domains/Report/utils/income-math';

export class TelegramAdminBotService {

  private static pendingLinks = new Map<string, PendingTelegramAdminLink>();
  private static pendingReportRanges = new Map<
    string,
    { step: 'START' | 'END'; startDate?: string; telegramUserId: number }
  >();
  private static pendingTopProductsRanges = new Map<
    string,
    { step: 'START' | 'END'; startDate?: string; telegramUserId: number }
  >();
  private static pendingSlowProductsRanges = new Map<
    string,
    { step: 'START' | 'END'; startDate?: string; telegramUserId: number }
  >();
  private static pendingIncomeRanges = new Map<
    string,
    { step: 'START' | 'END'; startDate?: string; telegramUserId: number }
  >();
  private static readonly DEFAULT_EXPIRES_MINUTES = 10;
  private static readonly MAX_CUSTOM_RANGE_DAYS = 31;
  private static readonly MAX_TOP_PRODUCTS_RANGE_DAYS = 366;
  private static readonly MAX_SLOW_PRODUCTS_RANGE_DAYS = 366;
  private static readonly MAX_INCOME_RANGE_DAYS = 366;

  static async handleUpdate(update: TelegramWebhookPayload) {
    const { telegramUserId, chatId, text, callbackData } =
      TelegramAdminParserService.parse(update);

    if (text?.startsWith('/link')) {
      const username = update.message?.from?.username;
      return this.handleLinkCommand(telegramUserId, chatId, text, username);
    }

    const link = await TelegramAdminLinksService.requireActiveLink(telegramUserId, chatId);
    const adminUserId = link.userId;

    if (callbackData) {
      return this.handleCallback(update.callback_query, adminUserId);
    }

    const pendingKey = this.getPendingKey(chatId);
    if (text && this.pendingReportRanges.has(pendingKey)) {
      return this.handleReportRangeInput(pendingKey, chatId, text, adminUserId, telegramUserId);
    }
    if (text && this.pendingTopProductsRanges.has(pendingKey)) {
      return this.handleTopProductsRangeInput(pendingKey, chatId, text, adminUserId, telegramUserId);
    }
    if (text && this.pendingSlowProductsRanges.has(pendingKey)) {
      return this.handleSlowProductsRangeInput(pendingKey, chatId, text, adminUserId, telegramUserId);
    }
    if (text && this.pendingIncomeRanges.has(pendingKey)) {
      return this.handleIncomeRangeInput(pendingKey, chatId, text, adminUserId, telegramUserId);
    }

    const command = TelegramAdminParserService.toCommand(text, callbackData);

    if (command.type === 'START') {
      const menuKey = getMenuStateKey(chatId, telegramUserId);
      resetStack(menuKey);
      await renderMenu(
        { chatId, telegramUserId },
        'main',
        { preferEdit: false }
      );
      return { sent: true };
    }

    if (command.type === 'REPORT') {
      const args = (text || '').trim().split(/\s+/).slice(1);
      await this.handleReportCommand(chatId, args, adminUserId, telegramUserId);
      return { sent: true };
    }

    if (command.type === 'LOWSTOCK') {
      await this.sendLowStockList(chatId, adminUserId);
      return { sent: true };
    }

    if (command.type === 'SHIFT_SUMMARY') {
      await this.sendShiftSummary(chatId, adminUserId);
      return { sent: true };
    }

    if (command.type === 'RESEND_LAST_REPORT') {
      await this.sendConfirm(chatId, 'RESEND_LAST_REPORT');
      return { sent: true };
    }

    if (command.type === 'UNLINK_BOT') {
      await this.sendConfirm(chatId, 'UNLINK_BOT');
      return { sent: true };
    }

    if (command.type === 'PRODUCT_LOOKUP') {
      const product = await ProductService.getProductByCode(
        command.productCode!,
        adminUserId
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
        adminUserId
      );

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
        status: 'SENT'
      });
      await auditLogService.createAuditLog({
        userId: adminUserId,
        action: 'TELEGRAM_ADMIN_STOCK_WRITE',
        resource: 'stock',
        details: { product_code: command.productCode, qty: command.qty }
      });
      return { sent: true };
    }

    logger.warn('Unknown command', { text });
    return { sent: false };
  }

  static async handleCommand(message: any, adminUserId = 0) {
    const text = (message.text || '').trim();
    const chatId = message.chat?.id;
    const telegramUserId = message.from?.id ?? 0;

    if (text.startsWith('/report')) {
      const args = text.split(' ').slice(1);
      return this.handleReportCommand(chatId, args, adminUserId, telegramUserId);
    }

    if (text === '/low_stock') {
      return this.sendLowStockList(chatId, adminUserId);
    }

    if (text === '/shift_summary') {
      return this.sendShiftSummary(chatId, adminUserId);
    }

    if (text === '/resend_last_report') {
      return this.sendConfirm(chatId, 'RESEND_LAST_REPORT');
    }

    if (text === '/unlink_bot') {
      return this.sendConfirm(chatId, 'UNLINK_BOT');
    }

    return TelegramService.sendMessageByChatId(chatId, 'Unknown command', 'Markdown');
  }

  static async handleCallback(callback: any, adminUserId = 0) {
    const data = callback.data || '';
    const chatId = callback.message?.chat?.id;
    const telegramUserId = callback?.from?.id ?? 0;
    const messageId = callback?.message?.message_id;
    const menuKey = getMenuStateKey(chatId, telegramUserId);

    try {
      await TelegramService.answerCallback(callback.id, 'OK');
    } catch (error: any) {
      logger.warn('Failed to answer Telegram callback', { error: error.message });
    }

    if (data.startsWith('nav:')) {
      const parts = data.split(':');
      const navType = parts[1];
      const navTarget = parts[2] as MenuId | undefined;
      const ctx = { chatId, telegramUserId, messageId, fromCallback: true };

      if (navType === 'home') {
        goHome(menuKey);
        return renderMenu(ctx, 'main');
      }

      if (navType === 'back') {
        const previous = popMenu(menuKey);
        const target = previous ?? goHome(menuKey);
        return renderMenu(ctx, target);
      }

      if (navType === 'open' && navTarget) {
        if (navTarget === 'main') {
          resetStack(menuKey);
        } else {
          pushMenu(menuKey, navTarget);
        }
        return renderMenu(ctx, navTarget);
      }
    }

    if (data.startsWith('action:')) {
      const [, actionId, ...rest] = data.split(':');
      const payload = rest.length ? rest.join(':') : undefined;
      return this.handleMenuAction(actionId, payload, chatId, adminUserId, telegramUserId);
    }

    if (data.startsWith('REPORT:')) {
      const range = data.replace('REPORT:', '');
      if (range === 'CUSTOM') {
        const pendingKey = this.getPendingKey(chatId);
        this.pendingSlowProductsRanges.delete(pendingKey);
        this.pendingTopProductsRanges.delete(pendingKey);
        this.pendingIncomeRanges.delete(pendingKey);
        this.pendingReportRanges.set(pendingKey, { step: 'START', telegramUserId });
        return TelegramService.sendMessageByChatId(
          chatId,
          this.buildCustomRangePrompt('report'),
          'Markdown'
        );
      }
      return this.sendReportByRange(chatId, range, adminUserId);
    }

    if (data === 'LOW_STOCK') {
      return this.sendLowStockList(chatId, adminUserId);
    }

    if (data === 'SHIFT_SUMMARY') {
      return this.sendShiftSummary(chatId, adminUserId);
    }

    if (data === 'MENU:MAIN') {
      const ctx = { chatId, telegramUserId, messageId, fromCallback: true };
      goHome(menuKey);
      return renderMenu(ctx, 'main');
    }

    if (data === 'inv_menu') {
      const ctx = { chatId, telegramUserId, messageId, fromCallback: true };
      pushMenu(menuKey, 'inventory');
      return renderMenu(ctx, 'inventory');
    }

    if (data === 'inv_on_hand') {
      return this.sendInventoryOnHand(chatId);
    }

    if (data === 'inv_value') {
      return this.sendInventoryValue(chatId);
    }

    if (data === 'inv_low_stock') {
      return this.sendLowStockList(chatId, adminUserId, { withNav: true });
    }

    if (data === 'inv_reorder') {
      return this.sendReorderAlerts(chatId);
    }

    if (data === 'nav_home') {
      const ctx = { chatId, telegramUserId, messageId, fromCallback: true };
      goHome(menuKey);
      return renderMenu(ctx, 'main');
    }

    if (data === 'nav_back') {
      const ctx = { chatId, telegramUserId, messageId, fromCallback: true };
      const previous = popMenu(menuKey);
      const target = previous ?? goHome(menuKey);
      return renderMenu(ctx, target);
    }

    if (data.startsWith('TOP_PRODUCTS:')) {
      const range = data.replace('TOP_PRODUCTS:', '');
      if (range === 'MENU') {
        const ctx = { chatId, telegramUserId, messageId, fromCallback: true };
        pushMenu(menuKey, 'top_products');
        return renderMenu(ctx, 'top_products');
      }
      if (range === 'CUSTOM') {
        const telegramUserId = callback?.from?.id ?? 0;
        const pendingKey = this.getPendingKey(chatId);
        this.pendingReportRanges.delete(pendingKey);
        this.pendingSlowProductsRanges.delete(pendingKey);
        this.pendingIncomeRanges.delete(pendingKey);
        this.pendingTopProductsRanges.set(pendingKey, { step: 'START', telegramUserId });
        return TelegramService.sendMessageByChatId(
          chatId,
          this.buildCustomRangePrompt('top'),
          'Markdown'
        );
      }
      return this.sendTopProductsByRange(chatId, range, adminUserId);
    }

    if (data.startsWith('SLOW_PRODUCTS:')) {
      const range = data.replace('SLOW_PRODUCTS:', '');
      if (range === 'MENU') {
        const ctx = { chatId, telegramUserId, messageId, fromCallback: true };
        pushMenu(menuKey, 'slow_products');
        return renderMenu(ctx, 'slow_products');
      }
      if (range === 'CUSTOM') {
        const telegramUserId = callback?.from?.id ?? 0;
        const pendingKey = this.getPendingKey(chatId);
        this.pendingReportRanges.delete(pendingKey);
        this.pendingTopProductsRanges.delete(pendingKey);
        this.pendingIncomeRanges.delete(pendingKey);
        this.pendingSlowProductsRanges.set(pendingKey, { step: 'START', telegramUserId });
        return TelegramService.sendMessageByChatId(
          chatId,
          this.buildCustomRangePrompt('slow'),
          'Markdown'
        );
      }
      return this.sendSlowProductsByRange(chatId, range, adminUserId);
    }

    if (data.startsWith('INCOME:')) {
      const range = data.replace('INCOME:', '');
      if (range === 'MENU') {
        const ctx = { chatId, telegramUserId, messageId, fromCallback: true };
        pushMenu(menuKey, 'income');
        return renderMenu(ctx, 'income');
      }
      if (range === 'CUSTOM') {
        const telegramUserId = callback?.from?.id ?? 0;
        const pendingKey = this.getPendingKey(chatId);
        this.pendingReportRanges.delete(pendingKey);
        this.pendingTopProductsRanges.delete(pendingKey);
        this.pendingSlowProductsRanges.delete(pendingKey);
        this.pendingIncomeRanges.set(pendingKey, { step: 'START', telegramUserId });
        return TelegramService.sendMessageByChatId(
          chatId,
          this.buildCustomRangePrompt('income'),
          'Markdown'
        );
      }
      return this.sendIncomeByRange(chatId, range, adminUserId);
    }

    if (data.startsWith('ACTION:')) {
      const action = data.replace('ACTION:', '');
      return this.sendConfirm(chatId, action);
    }

    if (data.startsWith('CONFIRM:')) {
      const action = data.replace('CONFIRM:', '');
      return this.executeConfirmedAction(chatId, action, adminUserId);
    }

    return { sent: false };
  }

  private static async handleMenuAction(
    actionId: string,
    payload: string | undefined,
    chatId: number,
    adminUserId: number,
    telegramUserId: number
  ) {
    const pendingKey = this.getPendingKey(chatId);

    switch (actionId) {
      case 'report': {
        if (payload === 'custom') {
          this.pendingSlowProductsRanges.delete(pendingKey);
          this.pendingTopProductsRanges.delete(pendingKey);
          this.pendingIncomeRanges.delete(pendingKey);
          this.pendingReportRanges.set(pendingKey, { step: 'START', telegramUserId });
          return TelegramService.sendMessageByChatId(
            chatId,
            this.buildCustomRangePrompt('report'),
            'Markdown'
          );
        }
        if (!payload) {
          return TelegramService.sendMessageByChatId(
            chatId,
            'Invalid report range.',
            'Markdown'
          );
        }
        return this.sendReportByRange(chatId, payload, adminUserId);
      }
      case 'top_products': {
        if (payload === 'custom') {
          this.pendingReportRanges.delete(pendingKey);
          this.pendingSlowProductsRanges.delete(pendingKey);
          this.pendingIncomeRanges.delete(pendingKey);
          this.pendingTopProductsRanges.set(pendingKey, { step: 'START', telegramUserId });
          return TelegramService.sendMessageByChatId(
            chatId,
            this.buildCustomRangePrompt('top'),
            'Markdown'
          );
        }
        if (!payload) {
          return TelegramService.sendMessageByChatId(
            chatId,
            'Invalid range.',
            'Markdown'
          );
        }
        return this.sendTopProductsByRange(chatId, payload, adminUserId);
      }
      case 'slow_products': {
        if (payload === 'custom') {
          this.pendingReportRanges.delete(pendingKey);
          this.pendingTopProductsRanges.delete(pendingKey);
          this.pendingIncomeRanges.delete(pendingKey);
          this.pendingSlowProductsRanges.set(pendingKey, { step: 'START', telegramUserId });
          return TelegramService.sendMessageByChatId(
            chatId,
            this.buildCustomRangePrompt('slow'),
            'Markdown'
          );
        }
        if (!payload) {
          return TelegramService.sendMessageByChatId(
            chatId,
            'Invalid range.',
            'Markdown'
          );
        }
        return this.sendSlowProductsByRange(chatId, payload, adminUserId);
      }
      case 'income': {
        if (payload === 'custom') {
          this.pendingReportRanges.delete(pendingKey);
          this.pendingTopProductsRanges.delete(pendingKey);
          this.pendingSlowProductsRanges.delete(pendingKey);
          this.pendingIncomeRanges.set(pendingKey, { step: 'START', telegramUserId });
          return TelegramService.sendMessageByChatId(
            chatId,
            this.buildCustomRangePrompt('income'),
            'Markdown'
          );
        }
        if (!payload) {
          return TelegramService.sendMessageByChatId(
            chatId,
            'Invalid range.',
            'Markdown'
          );
        }
        return this.sendIncomeByRange(chatId, payload, adminUserId);
      }
      case 'inventory_on_hand':
        return this.sendInventoryOnHand(chatId);
      case 'inventory_value':
        return this.sendInventoryValue(chatId);
      case 'inventory_low_stock':
        return this.sendLowStockList(chatId, adminUserId, { withNav: true });
      case 'inventory_reorder':
        return this.sendReorderAlerts(chatId);
      case 'shift_summary':
        return this.sendShiftSummary(chatId, adminUserId);
      case 'resend_last_report':
        return this.sendConfirm(chatId, 'RESEND_LAST_REPORT');
      default:
        return { sent: false };
    }
  }

  // ---------- Link Code (Admin → /link CODE) ----------
  static async createLinkCode(
    payload: CreateTelegramAdminLinkRequest,
    requestedByUserId: number
  ): Promise<CreateTelegramAdminLinkResponse> {
    const adminId = payload.admin_user_id;

    //1) Verify requester
    if (!requestedByUserId || requestedByUserId !== adminId) {
      throw new Error('FORBIDDEN');
    }

    //2) Verify admin role
    const admin = await UserService.getUser(adminId, requestedByUserId);
    if (!admin || admin.role !== UserRole.ADMIN) {
      throw new Error('NOT_ADMIN');
    }


    const minutes = payload.expires_in_minutes ?? this.DEFAULT_EXPIRES_MINUTES;
    const expiresAtMs = Date.now() + minutes * 60 * 1000;
    const linkCode = this.generateLinkCode();

    this.pendingLinks.set(linkCode, {
      adminUserId: adminId,
      telegramUserId: payload.telegram_user_id,
      telegramUsername: payload.telegram_username,
      expiresAtMs
    });

    await auditLogService.createAuditLog({
      action: 'CREATE_TELEGRAM_LINK_CODE',
      userId: adminId,
      resource: 'telegram_admin_bot',
      entityId: adminId,
      details: { link_code: linkCode, expires_in_minutes: minutes }
    });

    return {
      link_code: linkCode,
      expires_at: toPhnomPenhISOString(new Date(expiresAtMs)),
      link_status: 'PENDING'
    };
  }

  // Used by webhook when admin sends /link CODE
  static consumeLinkCode(code: string): PendingTelegramAdminLink | null {
    const pending = this.pendingLinks.get(code);
    if (!pending) return null;
    if (pending.expiresAtMs < Date.now()) {
      this.pendingLinks.delete(code);
      return null;
    }
    this.pendingLinks.delete(code);
    return pending;
  }

  private static generateLinkCode() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let raw = '';
    for (let i = 0; i < 6; i++) {
      raw += chars[randomInt(0, chars.length)];
    }
    return `ADM-${raw}`;
  }

  private static async handleReportCommand(
    chatId: number,
    args: string[],
    adminUserId: number,
    telegramUserId: number
  ) {
    if (args[0] === 'custom') {
      const key = this.getPendingKey(chatId);
      this.pendingReportRanges.set(key, { step: 'START', telegramUserId });
      return TelegramService.sendMessageByChatId(
        chatId,
        this.buildCustomRangePrompt('report'),
        'Markdown'
      );
    }

    if (args.length === 2 && this.isValidDate(args[0]) && this.isValidDate(args[1])) {
      return this.sendReportByDateRange(chatId, args[0], args[1], adminUserId, {
        maxDays: this.MAX_CUSTOM_RANGE_DAYS,
      });
    }

    const range = args.join('_');
    return this.sendReportByRange(chatId, range || 'today', adminUserId);
  }

  private static async sendReportByRange(chatId: number, range: string, adminUserId: number) {
    const resolved = this.resolveReportRange(range);
    if (!resolved) {
      return TelegramService.sendMessageByChatId(
        chatId,
        'Invalid report range. Use `today`, `yesterday`, `this_week`, `this_month`, `this_year`, or `YYYY-MM-DD`.',
        'Markdown'
      );
    }

    if (resolved.startDate === resolved.endDate) {
      const report = await ReportService.getDailyReport(
        { date: resolved.startDate },
        adminUserId,
        Role.ADMIN
      );
      const message = buildDailyAggregateReportMessage(report);
      return TelegramService.sendMessageByChatId(chatId, message, 'Markdown');
    }

    return this.sendReportByDateRange(
      chatId,
      resolved.startDate,
      resolved.endDate,
      adminUserId
    );
  }

  private static async sendLowStockList(
    chatId: number,
    adminUserId: number,
    options?: { withNav?: boolean }
  ) {
    const report = await InventoryReportService.getLowStock(adminUserId);
    const lines = report.stock_report.map((item, index) => {
      const name = this.escapeMarkdown(item.product_name);
      const code = this.escapeMarkdown(item.product_code ?? '-');
      return `${index + 1}) ${name} (${code}) - ${item.current_stock}`;
    });
    const summary = report.summary;
    const message = [
      '⚠️Low stock items',
      `Total products: ${summary.total_products}`,
      `Low stock: ${summary.low_stock_count}`,
      `Out of stock: ${summary.out_of_stock_count}`,
      `Negative stock: ${summary.negative_stock_count}`,
      '',
      lines.length ? lines.join('\n') : 'No low stock items.',
    ].join('\n');

    if (options?.withNav) {
      return this.sendMessageWithNav(chatId, message);
    }
    return this.sendMessageWithNav(chatId, message);
  }

  private static async sendInventoryOnHand(chatId: number) {
    const report = await InventoryReportService.getStockOnHand();
    if (!report.summary.total_skus) {
      return this.sendMessageWithNav(chatId, 'មិនមានទិន្នន័យ');
    }

    const lines = report.items.map((item, index) => {
      const name = this.escapeMarkdown(item.product_name);
      const code = this.escapeMarkdown(item.product_code ?? '-');
      return `${index + 1}) ${name} (${code}) - ${item.quantity}`;
    });

    const message = [
      '📦 *ស្តុកនៅសល់*',
      `• ចំនួន SKU: ${report.summary.total_skus}`,
      `• ចំនួនសរុប: ${report.summary.total_qty}`,
      '',
      ...(lines.length ? lines : ['មិនមានទិន្នន័យ']),
    ].join('\n');

    return this.sendMessageWithNav(chatId, message);
  }

  private static async sendInventoryValue(chatId: number) {
    const report = await InventoryReportService.getInventoryValue();
    if (!report.summary.total_skus) {
      return this.sendMessageWithNav(chatId, 'មិនមានទិន្នន័យ');
    }

    const totalValue = report.summary.total_value.toFixed(2);
    const lines = report.items.map((item, index) => {
      const name = this.escapeMarkdown(item.product_name);
      const code = this.escapeMarkdown(item.product_code ?? '-');
      return `${index + 1}) ${name} (${code})
• ចំនួន: ${item.quantity}
• តម្លៃ: $${item.total_value.toFixed(2)}`;
    });

    const message = [
      '💰 *តម្លៃស្តុកសរុប*',
      `• តម្លៃស្តុកសរុប: $${totalValue}`,
      `• ចំនួន SKU: ${report.summary.total_skus}`,
      `• ចំនួនសរុប: ${report.summary.total_qty}`,
      '',
      ...(lines.length ? lines : ['មិនមានទិន្នន័យ']),
    ].join('\n');

    return this.sendMessageWithNav(chatId, message);
  }

  private static async sendReorderAlerts(chatId: number) {
    const report = await InventoryReportService.getReorderAlerts();
    if (!report.items.length) {
      return this.sendMessageWithNav(chatId, 'មិនមានទិន្នន័យ');
    }

    const lines = report.items.map((item, index) => {
      const name = this.escapeMarkdown(item.product_name);
      const code = this.escapeMarkdown(item.product_code ?? '-');
      return `${index + 1}) ${name} (${code})
• ស្តុកនៅសល់: ${item.quantity}
• កម្រិតបញ្ជាទិញឡើងវិញ: ${item.reorder_point}`;
    });

    const message = [
      '🚨 *ស្តុកជិតអស់*',
      '',
      ...lines,
    ].join('\n');

    return this.sendMessageWithNav(chatId, message);
  }

  private static async sendMessageWithNav(chatId: number, message: string) {
    return TelegramService.sendMenuMessage(chatId, message, {
      inline_keyboard: [NAV_ROW],
    });
  }

  private static async sendShiftSummary(chatId: number, adminUserId: number) {
    const today = formatDate(new Date());
    const response = await ShiftService.listShifts(
      { page: 1, limit: 20, start_date: today, end_date: today },
      adminUserId,
      Role.ADMIN
    );

    const lines = response.shifts.map((shift, index) => {
      const start = shift.start_time ? new Date(shift.start_time).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }) : '-';
      const end = shift.end_time ? new Date(shift.end_time).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }) : '-';
      return `${index + 1}) ${shift.seller_name ?? 'Unknown'} - ${shift.status}
• Sales: $${Number(shift.total_sales_amount).toLocaleString()} (${shift.total_sales_count} orders)
• Time: ${start} - ${end}`;
    });

    const message = [
      `📋 *Shift Summary* (${today})`,
      '',
      lines.length ? lines.join('\n\n') : 'No shifts found for today.',
    ].join('\n');

    return this.sendMessageWithNav(chatId, message);
  }

  private static async sendConfirm(chatId: number, action: string) {
    return TelegramService.sendConfirmKeyboard(chatId, action);
  }

  private static async executeConfirmedAction(
    chatId: number,
    action: string,
    adminUserId: number
  ) {
    if (action === 'CANCEL') {
      return TelegramService.sendMessageByChatId(chatId, 'Cancelled.', 'Markdown');
    }
    if (action === 'RESEND_LAST_REPORT') {
      return this.sendReportByRange(chatId, 'today', adminUserId);
    }
    if (action === 'UNLINK_BOT') {
      return TelegramService.sendMessageByChatId(chatId, 'Bot unlinked', 'Markdown');
    }
  }

  private static async handleLinkCommand(
    telegramUserId: number,
    chatId: number,
    text: string,
    telegramUsername?: string
  ) {
    const parts = text.trim().split(/\s+/);
    const code = parts[1];
    if (!code) {
      return TelegramService.sendMessageByChatId(
        chatId,
        'Usage: /link ADM-XXXXXX',
        'Markdown'
      );
    }

    const pending = this.consumeLinkCode(code);
    if (!pending) {
      return TelegramService.sendMessageByChatId(
        chatId,
        'Invalid or expired link code.',
        'Markdown'
      );
    }

    if (pending.telegramUserId && pending.telegramUserId !== telegramUserId) {
      return TelegramService.sendMessageByChatId(
        chatId,
        'This link code is not for your Telegram account.',
        'Markdown'
      );
    }

    if (pending.telegramUsername && telegramUsername && pending.telegramUsername !== telegramUsername) {
      return TelegramService.sendMessageByChatId(
        chatId,
        'This link code is not for your Telegram username.',
        'Markdown'
      );
    }

    await TelegramAdminLinksService.linkAdmin({
      userId: pending.adminUserId,
      telegramUserId,
      chatId,
    });

    await auditLogService.createAuditLog({
      action: 'LINK_TELEGRAM_ADMIN',
      userId: pending.adminUserId,
      resource: 'telegram_admin_bot',
      entityId: pending.adminUserId,
      details: {
        telegram_user_id: telegramUserId,
        telegram_username: telegramUsername,
      },
    });

    return TelegramService.sendMessageByChatId(
      chatId,
      'Admin linked successfully.',
      'Markdown'
    );
  }

  private static resolveReportRange(range: string): { startDate: string; endDate: string } | null {
    const normalized = range.trim().toLowerCase();
    const today = new Date();
    if (!normalized || normalized === 'today') {
      const date = formatDate(today);
      return { startDate: date, endDate: date };
    }
    if (normalized === 'yesterday') {
      const date = formatDate(subtractDaysFromDate(today, 1));
      return { startDate: date, endDate: date };
    }
    if (normalized === 'this_week') {
      const start = formatDate(startOfWeek(today, { weekStartsOn: 1 }));
      const end = formatDate(today);
      return { startDate: start, endDate: end };
    }
    if (normalized === 'this_month') {
      const start = formatDate(startOfMonth(today));
      const end = formatDate(today);
      return { startDate: start, endDate: end };
    }
    if (normalized === 'this_year') {
      const start = formatDate(startOfYear(today));
      const end = formatDate(today);
      return { startDate: start, endDate: end };
    }
    if (normalized === 'last_7_days') {
      const start = formatDate(subtractDaysFromDate(today, 6));
      const end = formatDate(today);
      return { startDate: start, endDate: end };
    }
    if (this.isValidDate(range)) {
      return { startDate: range, endDate: range };
    }
    return null;
  }
  
  private static async sendReportByDateRange(
    chatId: number,
    startDate: string,
    endDate: string,
    adminUserId: number,
    options?: { maxDays?: number }
  ) {
    if (!this.isValidDate(startDate) || !this.isValidDate(endDate)) {
      return TelegramService.sendMessageByChatId(
        chatId,
        'Invalid date format. Use YYYY-MM-DD.',
        'Markdown'
      );
    }

    const start = new Date(`${startDate}T00:00:00Z`);
    const end = new Date(`${endDate}T00:00:00Z`);
    if (isNaN(start.getTime()) || isNaN(end.getTime()) || start > end) {
      return TelegramService.sendMessageByChatId(
        chatId,
        'Invalid date range. Ensure start_date <= end_date.',
        'Markdown'
      );
    }

    const diffDays = Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    if (options?.maxDays && diffDays > options.maxDays) {
      return TelegramService.sendMessageByChatId(
        chatId,
        `Date range too long. Max ${options.maxDays} days.`,
        'Markdown'
      );
    }

    const includeDaily = diffDays <= this.MAX_CUSTOM_RANGE_DAYS;
    const limit = includeDaily ? diffDays : 1;
    const report = await ReportService.getSalesHistoryReport(
      {
        start_date: startDate,
        end_date: endDate,
        page: 1,
        limit,
      },
      adminUserId,
      Role.ADMIN
    );

    const summary = report.summary;
    const header = [
      '📊 *Sales Report*',
      `📅 Range: ${startDate} → ${endDate} (${diffDays} days)`,
      '',
      `• Total sales: $${summary.total_sales.toLocaleString()}`,
      `• Total orders: ${summary.total_orders}`,
      `• Avg daily sales: $${summary.average_daily_sales.toFixed(2)}`,
    ];

    const dailyLines = includeDaily
      ? report.sales.map((item, index) => {
          return `${index + 1}) ${item.date} - $${item.total_sales.toLocaleString()} (${item.total_orders} orders)`;
        })
      : [];

    const message = [
      ...header,
      ...(dailyLines.length ? ['', ...dailyLines] : []),
    ].join('\n');

    return TelegramService.sendMessageByChatId(chatId, message, 'Markdown');
  }

  private static getPendingKey(chatId: number) {
    return `${chatId}`;
  }

  private static buildCustomRangePrompt(
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

  private static async handleReportRangeInput(
    pendingKey: string,
    chatId: number,
    text: string,
    adminUserId: number,
    telegramUserId: number
  ) {
    const input = text.trim();
    if (input.startsWith('/')) {
      const parts = input.split(/\s+/).filter(Boolean);
      const command = (parts[0] || '').split('@')[0].toLowerCase();
      const args = parts.slice(1);

      if (command === '/cancel') {
        this.pendingReportRanges.delete(pendingKey);
        return TelegramService.sendMessageByChatId(chatId, 'Report request cancelled.', 'Markdown');
      }

      if (command === '/report') {
        this.pendingReportRanges.delete(pendingKey);
        if (args.length >= 1) {
          if (args.length === 2 && this.isValidDate(args[0]) && this.isValidDate(args[1])) {
            return this.sendReportByDateRange(chatId, args[0], args[1], adminUserId, {
              maxDays: this.MAX_CUSTOM_RANGE_DAYS,
            });
          }
          const range = args.join('_');
          return this.sendReportByRange(chatId, range, adminUserId);
        }

        const dates = input.match(/\d{4}-\d{2}-\d{2}/g) || [];
        if (dates.length >= 2) {
          const [startDate, endDate] = dates;
          if (!startDate || !endDate) {
            return TelegramService.sendMessageByChatId(
              chatId,
              'Please provide a valid date range. Example: /report 2026-01-01 2026-01-30',
              'Markdown'
            );
          }
          return this.sendReportByDateRange(chatId, startDate, endDate, adminUserId, {
            maxDays: this.MAX_CUSTOM_RANGE_DAYS,
          });
        }
        if (dates.length === 1) {
          return this.sendReportByRange(chatId, dates[0], adminUserId);
        }

        return TelegramService.sendMessageByChatId(
          chatId,
          'Please provide a date or range. Example: /report 2026-01-01 2026-01-30',
          'Markdown'
        );
      }

      return TelegramService.sendMessageByChatId(
        chatId,
        'Report range pending. Send /cancel to stop.',
        'Markdown'
      );
    }

    const pending = this.pendingReportRanges.get(pendingKey);
    if (!pending) return;
    if (pending.telegramUserId !== telegramUserId) {
      return TelegramService.sendMessageByChatId(
        chatId,
        'Another user is completing a custom report. Please wait or use /report custom after it finishes.',
        'Markdown'
      );
    }

    if (pending.step === 'START') {
      if (!this.isValidDate(input)) {
        return TelegramService.sendMessageByChatId(
          chatId,
          'Invalid start date. Use YYYY-MM-DD.',
          'Markdown'
        );
      }
      this.pendingReportRanges.set(pendingKey, {
        step: 'END',
        startDate: input,
        telegramUserId: pending.telegramUserId,
      });
      return TelegramService.sendMessageByChatId(
        chatId,
        'Please enter end date (YYYY-MM-DD).',
        'Markdown'
      );
    }

    if (!this.isValidDate(input) || !pending.startDate) {
      return TelegramService.sendMessageByChatId(
        chatId,
        'Invalid end date. Use YYYY-MM-DD.',
        'Markdown'
      );
    }

    const startDate = pending.startDate;
    this.pendingReportRanges.delete(pendingKey);
    return this.sendReportByDateRange(
      chatId,
      startDate,
      input,
      adminUserId,
      { maxDays: this.MAX_CUSTOM_RANGE_DAYS }
    );
  }

  private static async handleTopProductsRangeInput(
    pendingKey: string,
    chatId: number,
    text: string,
    adminUserId: number,
    telegramUserId: number
  ) {
    const input = text.trim();
    if (input.startsWith('/')) {
      const parts = input.split(/\s+/).filter(Boolean);
      const command = (parts[0] || '').split('@')[0].toLowerCase();
      const args = parts.slice(1);

      if (command === '/cancel') {
        this.pendingTopProductsRanges.delete(pendingKey);
        return TelegramService.sendMessageByChatId(chatId, 'Report request cancelled.', 'Markdown');
      }

      if (command === '/top' || command === '/top_products') {
        this.pendingTopProductsRanges.delete(pendingKey);
        if (args.length >= 1) {
          if (args.length === 2 && this.isValidDate(args[0]) && this.isValidDate(args[1])) {
            return this.sendTopProductsByDateRange(chatId, args[0], args[1], adminUserId, {
              maxDays: this.MAX_TOP_PRODUCTS_RANGE_DAYS,
            });
          }
          const range = args.join('_');
          return this.sendTopProductsByRange(chatId, range, adminUserId);
        }

        const dates = input.match(/\d{4}-\d{2}-\d{2}/g) || [];
        if (dates.length >= 2) {
          const [startDate, endDate] = dates;
          if (!startDate || !endDate) {
            return TelegramService.sendMessageByChatId(
              chatId,
              'Please provide a valid date range. Example: /top 2026-01-01 2026-01-30',
              'Markdown'
            );
          }
          return this.sendTopProductsByDateRange(chatId, startDate, endDate, adminUserId, {
            maxDays: this.MAX_TOP_PRODUCTS_RANGE_DAYS,
          });
        }
        if (dates.length === 1) {
          return this.sendTopProductsByRange(chatId, dates[0], adminUserId);
        }

        return TelegramService.sendMessageByChatId(
          chatId,
          'Please provide a date or range. Example: /top 2026-01-01 2026-01-30',
          'Markdown'
        );
      }

      return TelegramService.sendMessageByChatId(
        chatId,
        'Top products range pending. Send /cancel to stop.',
        'Markdown'
      );
    }

    const pending = this.pendingTopProductsRanges.get(pendingKey);
    if (!pending) return;
    if (pending.telegramUserId !== telegramUserId) {
      return TelegramService.sendMessageByChatId(
        chatId,
        'Another user is completing a custom report. Please wait.',
        'Markdown'
      );
    }

    if (pending.step === 'START') {
      if (!this.isValidDate(input)) {
        return TelegramService.sendMessageByChatId(
          chatId,
          'Invalid start date. Use YYYY-MM-DD.',
          'Markdown'
        );
      }
      this.pendingTopProductsRanges.set(pendingKey, {
        step: 'END',
        startDate: input,
        telegramUserId: pending.telegramUserId,
      });
      return TelegramService.sendMessageByChatId(
        chatId,
        'Please enter end date (YYYY-MM-DD).',
        'Markdown'
      );
    }

    if (!this.isValidDate(input) || !pending.startDate) {
      return TelegramService.sendMessageByChatId(
        chatId,
        'Invalid end date. Use YYYY-MM-DD.',
        'Markdown'
      );
    }

    const startDate = pending.startDate;
    this.pendingTopProductsRanges.delete(pendingKey);
    return this.sendTopProductsByDateRange(
      chatId,
      startDate,
      input,
      adminUserId,
      { maxDays: this.MAX_TOP_PRODUCTS_RANGE_DAYS }
    );
  }

  private static async sendTopProductsByRange(
    chatId: number,
    range: string,
    adminUserId: number
  ) {
    const resolved = this.resolveReportRange(range);
    if (!resolved) {
      return TelegramService.sendMessageByChatId(
        chatId,
        'Invalid range. Use today, yesterday, this_week, this_month, this_year, or YYYY-MM-DD.',
        'Markdown'
      );
    }

    if (resolved.startDate === resolved.endDate) {
      const report = await ReportService.getDailyReport(
        { date: resolved.startDate },
        adminUserId,
        Role.ADMIN
      );
      return this.sendTopProductsMessage(chatId, resolved.startDate, resolved.endDate, report.top_products);
    }

    return this.sendTopProductsByDateRange(
      chatId,
      resolved.startDate,
      resolved.endDate,
      adminUserId
    );
  }

  private static async sendTopProductsByDateRange(
    chatId: number,
    startDate: string,
    endDate: string,
    adminUserId: number,
    options?: { maxDays?: number }
  ) {
    if (!this.isValidDate(startDate) || !this.isValidDate(endDate)) {
      return TelegramService.sendMessageByChatId(
        chatId,
        'Invalid date format. Use YYYY-MM-DD.',
        'Markdown'
      );
    }

    const start = new Date(`${startDate}T00:00:00Z`);
    const end = new Date(`${endDate}T23:59:59Z`);
    if (isNaN(start.getTime()) || isNaN(end.getTime()) || start > end) {
      return TelegramService.sendMessageByChatId(
        chatId,
        'Invalid date range. Ensure start_date <= end_date.',
        'Markdown'
      );
    }

    const diffDays = Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    if (options?.maxDays && diffDays > options.maxDays) {
      return TelegramService.sendMessageByChatId(
        chatId,
        `Date range too long. Max ${options.maxDays} days.`,
        'Markdown'
      );
    }

    const topProductsRaw = await prisma.orderItem.groupBy({
      by: ['productId'],
      where: {
        order: {
          orderDate: {
            gte: start,
            lte: end,
          },
        },
      },
      _sum: { quantity: true, subtotal: true },
      _count: { orderItemId: true },
      orderBy: { _sum: { subtotal: 'desc' } },
      take: 10,
    });

    if (!topProductsRaw.length) {
      return TelegramService.sendMessageByChatId(
        chatId,
        'No sales found for this range.',
        'Markdown'
      );
    }

    const productIds = topProductsRaw.map((p) => p.productId);
    const products = await prisma.product.findMany({
      where: { productId: { in: productIds } },
      select: { productId: true, productName: true, productCode: true, price: true },
    });
    const productMap = new Map(products.map((p) => [p.productId, p]));

    const topProducts = topProductsRaw.map((p) => {
      const product = productMap.get(p.productId);
      const quantitySold = Number(p._sum.quantity || 0);
      const revenue = Number(p._sum.subtotal || 0);
      const averagePrice = quantitySold > 0 ? revenue / quantitySold : Number(product?.price || 0);
      return {
        product_id: p.productId,
        product_name: product?.productName || 'Unknown Product',
        product_code: product?.productCode || 'N/A',
        quantity_sold: quantitySold,
        revenue,
        average_price: Number(averagePrice.toFixed(2)),
      };
    });

    return this.sendTopProductsMessage(chatId, startDate, endDate, topProducts);
  }

  private static async sendTopProductsMessage(
    chatId: number,
    startDate: string,
    endDate: string,
    topProducts: Array<{
      product_id: number;
      product_name: string;
      product_code: string;
      quantity_sold: number;
      revenue: number;
      average_price: number;
    }>
  ) {
    const header = [
      '🏆 *ទំនិញលក់ដាច់បំផុត*',
      `📅 Range: ${startDate} → ${endDate}`,
      '',
    ];

    const lines = topProducts.map((p, index) => {
      const name = this.escapeMarkdown(p.product_name);
      // const code = this.escapeMarkdown(p.product_code);
      return `${index + 1}) ${name}
        •បរិមាណលក់: ${p.quantity_sold}
        •ចំណូល: $${p.revenue.toLocaleString()}
        •តម្លៃមធ្យម: $${p.average_price.toFixed(2)}`;
    });

    return this.sendMessageWithNav(
      chatId,
      [...header, ...lines].join('\n')
    );
  }

  private static async handleSlowProductsRangeInput(
    pendingKey: string,
    chatId: number,
    text: string,
    adminUserId: number,
    telegramUserId: number
  ) {
    const input = text.trim();
    if (input.startsWith('/')) {
      const parts = input.split(/\s+/).filter(Boolean);
      const command = (parts[0] || '').split('@')[0].toLowerCase();
      const args = parts.slice(1);

      if (command === '/cancel') {
        this.pendingSlowProductsRanges.delete(pendingKey);
        return TelegramService.sendMessageByChatId(chatId, 'Report request cancelled.', 'Markdown');
      }

      if (command === '/slow' || command === '/slow_products') {
        this.pendingSlowProductsRanges.delete(pendingKey);
        if (args.length >= 1) {
          if (args.length === 2 && this.isValidDate(args[0]) && this.isValidDate(args[1])) {
            return this.sendSlowProductsByDateRange(chatId, args[0], args[1], adminUserId, {
              maxDays: this.MAX_SLOW_PRODUCTS_RANGE_DAYS,
            });
          }
          const range = args.join('_');
          return this.sendSlowProductsByRange(chatId, range, adminUserId);
        }

        const dates = input.match(/\d{4}-\d{2}-\d{2}/g) || [];
        if (dates.length >= 2) {
          const [startDate, endDate] = dates;
          if (!startDate || !endDate) {
            return TelegramService.sendMessageByChatId(
              chatId,
              'Please provide a valid date range. Example: /slow 2026-01-01 2026-01-30',
              'Markdown'
            );
          }
          return this.sendSlowProductsByDateRange(chatId, startDate, endDate, adminUserId, {
            maxDays: this.MAX_SLOW_PRODUCTS_RANGE_DAYS,
          });
        }
        if (dates.length === 1) {
          return this.sendSlowProductsByRange(chatId, dates[0], adminUserId);
        }

        return TelegramService.sendMessageByChatId(
          chatId,
          'Please provide a date or range. Example: /slow 2026-01-01 2026-01-30',
          'Markdown'
        );
      }

      return TelegramService.sendMessageByChatId(
        chatId,
        'Slow products range pending. Send /cancel to stop.',
        'Markdown'
      );
    }

    const pending = this.pendingSlowProductsRanges.get(pendingKey);
    if (!pending) return;
    if (pending.telegramUserId !== telegramUserId) {
      return TelegramService.sendMessageByChatId(
        chatId,
        'Another user is completing a custom report. Please wait.',
        'Markdown'
      );
    }

    if (pending.step === 'START') {
      if (!this.isValidDate(input)) {
        return TelegramService.sendMessageByChatId(
          chatId,
          'Invalid start date. Use YYYY-MM-DD.',
          'Markdown'
        );
      }
      this.pendingSlowProductsRanges.set(pendingKey, {
        step: 'END',
        startDate: input,
        telegramUserId: pending.telegramUserId,
      });
      return TelegramService.sendMessageByChatId(
        chatId,
        'Please enter end date (YYYY-MM-DD).',
        'Markdown'
      );
    }

    if (!this.isValidDate(input) || !pending.startDate) {
      return TelegramService.sendMessageByChatId(
        chatId,
        'Invalid end date. Use YYYY-MM-DD.',
        'Markdown'
      );
    }

    const startDate = pending.startDate;
    this.pendingSlowProductsRanges.delete(pendingKey);
    return this.sendSlowProductsByDateRange(
      chatId,
      startDate,
      input,
      adminUserId,
      { maxDays: this.MAX_SLOW_PRODUCTS_RANGE_DAYS }
    );
  }

  private static async sendSlowProductsByRange(
    chatId: number,
    range: string,
    adminUserId: number
  ) {
    const resolved = this.resolveReportRange(range);
    if (!resolved) {
      return TelegramService.sendMessageByChatId(
        chatId,
        'Invalid range. Use this_week, this_month, this_year, or YYYY-MM-DD.',
        'Markdown'
      );
    }

    return this.sendSlowProductsByDateRange(
      chatId,
      resolved.startDate,
      resolved.endDate,
      adminUserId
    );
  }

  private static async sendSlowProductsByDateRange(
    chatId: number,
    startDate: string,
    endDate: string,
    adminUserId: number,
    options?: { maxDays?: number }
  ) {
    if (!this.isValidDate(startDate) || !this.isValidDate(endDate)) {
      return TelegramService.sendMessageByChatId(
        chatId,
        'Invalid date format. Use YYYY-MM-DD.',
        'Markdown'
      );
    }

    const start = new Date(`${startDate}T00:00:00Z`);
    const end = new Date(`${endDate}T23:59:59Z`);
    if (isNaN(start.getTime()) || isNaN(end.getTime()) || start > end) {
      return TelegramService.sendMessageByChatId(
        chatId,
        'Invalid date range. Ensure start_date <= end_date.',
        'Markdown'
      );
    }

    const diffDays = Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    if (options?.maxDays && diffDays > options.maxDays) {
      return TelegramService.sendMessageByChatId(
        chatId,
        `Date range too long. Max ${options.maxDays} days.`,
        'Markdown'
      );
    }

    const salesRows = await prisma.orderItem.groupBy({
      by: ['productId'],
      where: {
        order: {
          orderDate: {
            gte: start,
            lte: end,
          },
        },
      },
      _sum: { quantity: true, subtotal: true },
    });

    const salesMap = new Map<number, { quantity: number; revenue: number }>();
    salesRows.forEach((row: any) => {
      salesMap.set(row.productId, {
        quantity: Number(row._sum?.quantity || 0),
        revenue: Number(row._sum?.subtotal || 0),
      });
    });

    const products = await prisma.product.findMany({
      where: { status: 'active', deactivatedDate: null },
      select: { productId: true, productName: true, productCode: true, price: true },
    });

    if (!products.length) {
      return TelegramService.sendMessageByChatId(
        chatId,
        'No products found.',
        'Markdown'
      );
    }

    const merged = products.map((p) => {
      const sales = salesMap.get(p.productId) || { quantity: 0, revenue: 0 };
      return {
        product_id: p.productId,
        product_name: p.productName,
        product_code: p.productCode,
        quantity_sold: sales.quantity,
        revenue: sales.revenue,
        average_price: Number(p.price),
      };
    });

    const slowProducts = merged
      .sort((a, b) => a.quantity_sold - b.quantity_sold || a.revenue - b.revenue)
      .slice(0, 10);

    return this.sendSlowProductsMessage(chatId, startDate, endDate, slowProducts);
  }

  private static async sendSlowProductsMessage(
    chatId: number,
    startDate: string,
    endDate: string,
    slowProducts: Array<{
      product_id: number;
      product_name: string;
      product_code: string;
      quantity_sold: number;
      revenue: number;
      average_price: number;
    }>
  ) {
    const header = [
      '🐢 *ទំនិញលក់មិនដាច់*',
      `📅 Range: ${startDate} → ${endDate}`,
      '',
    ];

    const lines = slowProducts.map((p, index) => {
      const name = this.escapeMarkdown(p.product_name);
      const code = this.escapeMarkdown(p.product_code);
      return `${index + 1}) ${name} (${code})
• បរិមាណលក់: ${p.quantity_sold}
• ចំណូល: $${p.revenue.toLocaleString()}
• តម្លៃ: $${p.average_price.toFixed(2)}`;
    });

    return TelegramService.sendMessageByChatId(
      chatId,
      [...header, ...(lines.length ? lines : ['No products found.'])].join('\n'),
      'Markdown'
    );
  }

  private static escapeMarkdown(text: string): string {
    return text.replace(/([_*[\]()`])/g, '\\$1');
  }

  private static async handleIncomeRangeInput(
    pendingKey: string,
    chatId: number,
    text: string,
    adminUserId: number,
    telegramUserId: number
  ) {
    const input = text.trim();
    if (input.startsWith('/')) {
      const parts = input.split(/\s+/).filter(Boolean);
      const command = (parts[0] || '').split('@')[0].toLowerCase();
      const args = parts.slice(1);

      if (command === '/cancel') {
        this.pendingIncomeRanges.delete(pendingKey);
        return TelegramService.sendMessageByChatId(chatId, 'Report request cancelled.', 'Markdown');
      }

      if (command === '/income' || command === '/profit') {
        this.pendingIncomeRanges.delete(pendingKey);
        if (args.length >= 1) {
          if (args.length === 2 && this.isValidDate(args[0]) && this.isValidDate(args[1])) {
            return this.sendIncomeByDateRange(chatId, args[0], args[1], adminUserId, {
              maxDays: this.MAX_INCOME_RANGE_DAYS,
            });
          }
          const range = args.join('_');
          return this.sendIncomeByRange(chatId, range, adminUserId);
        }

        const dates = input.match(/\d{4}-\d{2}-\d{2}/g) || [];
        if (dates.length >= 2) {
          const [startDate, endDate] = dates;
          if (!startDate || !endDate) {
            return TelegramService.sendMessageByChatId(
              chatId,
              'Please provide a valid date range. Example: /income 2026-01-01 2026-01-30',
              'Markdown'
            );
          }
          return this.sendIncomeByDateRange(chatId, startDate, endDate, adminUserId, {
            maxDays: this.MAX_INCOME_RANGE_DAYS,
          });
        }
        if (dates.length === 1) {
          return this.sendIncomeByRange(chatId, dates[0], adminUserId);
        }

        return TelegramService.sendMessageByChatId(
          chatId,
          'Please provide a date or range. Example: /income 2026-01-01 2026-01-30',
          'Markdown'
        );
      }

      return TelegramService.sendMessageByChatId(
        chatId,
        'Income range pending. Send /cancel to stop.',
        'Markdown'
      );
    }

    const pending = this.pendingIncomeRanges.get(pendingKey);
    if (!pending) return;
    if (pending.telegramUserId !== telegramUserId) {
      return TelegramService.sendMessageByChatId(
        chatId,
        'Another user is completing a custom report. Please wait.',
        'Markdown'
      );
    }

    if (pending.step === 'START') {
      if (!this.isValidDate(input)) {
        return TelegramService.sendMessageByChatId(
          chatId,
          'Invalid start date. Use YYYY-MM-DD.',
          'Markdown'
        );
      }
      this.pendingIncomeRanges.set(pendingKey, {
        step: 'END',
        startDate: input,
        telegramUserId: pending.telegramUserId,
      });
      return TelegramService.sendMessageByChatId(
        chatId,
        'Please enter end date (YYYY-MM-DD).',
        'Markdown'
      );
    }

    if (!this.isValidDate(input) || !pending.startDate) {
      return TelegramService.sendMessageByChatId(
        chatId,
        'Invalid end date. Use YYYY-MM-DD.',
        'Markdown'
      );
    }

    const startDate = pending.startDate;
    this.pendingIncomeRanges.delete(pendingKey);
    return this.sendIncomeByDateRange(
      chatId,
      startDate,
      input,
      adminUserId,
      { maxDays: this.MAX_INCOME_RANGE_DAYS }
    );
  }

  private static async sendIncomeByRange(
    chatId: number,
    range: string,
    adminUserId: number
  ) {
    const resolved = this.resolveReportRange(range);
    if (!resolved) {
      return TelegramService.sendMessageByChatId(
        chatId,
        'Invalid range. Use today, this_week, this_month, this_year, or YYYY-MM-DD.',
        'Markdown'
      );
    }

    return this.sendIncomeByDateRange(
      chatId,
      resolved.startDate,
      resolved.endDate,
      adminUserId
    );
  }

  private static async sendIncomeByDateRange(
    chatId: number,
    startDate: string,
    endDate: string,
    adminUserId: number,
    options?: { maxDays?: number }
  ) {
    if (!this.isValidDate(startDate) || !this.isValidDate(endDate)) {
      return TelegramService.sendMessageByChatId(
        chatId,
        'Invalid date format. Use YYYY-MM-DD.',
        'Markdown'
      );
    }

    const start = new Date(`${startDate}T00:00:00Z`);
    const end = new Date(`${endDate}T23:59:59Z`);
    if (isNaN(start.getTime()) || isNaN(end.getTime()) || start > end) {
      return TelegramService.sendMessageByChatId(
        chatId,
        'Invalid date range. Ensure start_date <= end_date.',
        'Markdown'
      );
    }

    const diffDays = Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    if (options?.maxDays && diffDays > options.maxDays) {
      return TelegramService.sendMessageByChatId(
        chatId,
        `Date range too long. Max ${options.maxDays} days.`,
        'Markdown'
      );
    }

    const salesAgg = await prisma.order.aggregate({
      where: { orderDate: { gte: start, lte: end } },
      _sum: { totalAmount: true },
      _count: { orderId: true },
    });

    const cogsAgg = await prisma.orderItem.aggregate({
      where: { order: { orderDate: { gte: start, lte: end } } },
      _sum: { cogsLineTotal: true, quantity: true },
    });

    const missingCogsRows = await prisma.$queryRaw<
      { missing_count: number }[]
    >(Prisma.sql`
      SELECT COUNT(*)::int AS missing_count
      FROM order_items oi
      JOIN orders o ON o.order_id = oi.order_id
      WHERE o.order_date >= ${start}
        AND o.order_date <= ${end}
        AND oi.cogs_line_total IS NULL
    `);
    const missingCogsCount = Number(missingCogsRows[0]?.missing_count || 0);
    if (missingCogsCount > 0) {
      logger.warn('Missing COGS for some order items', { missingCogsCount });
    }

    const purchasesRows = await prisma.$queryRaw<
      { total_cost: any; total_qty: any }[]
    >(Prisma.sql`
      SELECT
        COALESCE(SUM(COALESCE(cost, 0) * COALESCE(quantity, 0)), 0) AS total_cost,
        COALESCE(SUM(COALESCE(quantity, 0)), 0) AS total_qty
      FROM stock_movements
      WHERE movement_type = 'STOCK_IN'
        AND created_at >= ${start}
        AND created_at <= ${end}
    `);

    const totalSales = Number(salesAgg._sum.totalAmount || 0);
    const totalOrders = Number(salesAgg._count.orderId || 0);
    const totalItems = Number(cogsAgg._sum?.quantity || 0);
    const cogs = Number(cogsAgg._sum?.cogsLineTotal || 0);
    const purchasesCost = Number(purchasesRows[0]?.total_cost || 0);
    const purchasesQty = Number(purchasesRows[0]?.total_qty || 0);
    // TODO: If refunds/returns are implemented, subtract their amounts from sales and COGS.
    const profit = calculateProfit(totalSales, cogs);

    const message = [
      '💰 *របាយការណ៍ចំណូល*',
      `📅 Range: ${startDate} → ${endDate} (${diffDays} days)`,
      '',
      `• ចំណូលពីការលក់: $${totalSales.toLocaleString()}`,
      `• ចំនួនការលក់: ${totalOrders}`,
      `• ចំនួនទំនិញលក់: ${totalItems}`,
      `• COGS (តម្លៃដើម): $${cogs.toLocaleString()}`,
      `• ចំណេញ/ខាត: $${profit.toLocaleString()}`,
      '',
      `• ចំណាយនាំចូលសរុប: $${purchasesCost.toLocaleString()}`,
      `• បរិមាណនាំចូលសរុប: ${purchasesQty}`,
      '*សម្គាល់:* COGS គណនាតាម order items cost per unit at sale (locked at sale time).',
    ].join('\n');

    return TelegramService.sendMessageByChatId(chatId, message, 'Markdown');
  }

  private static isValidDate(value: string): boolean {
    return /^\d{4}-\d{2}-\d{2}$/.test(value);
  }
  
}
