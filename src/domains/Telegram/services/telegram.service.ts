import prisma from '@src/database/client';
import axios from 'axios';
import { encrypt, decrypt } from '@src/shared/utils/encryption';
import { logger } from '@src/shared/utils/logger';
import { env } from '@src/shared/config/env';
import { ReportService } from '@src/domains/Report/services/report.service';
import { ReportExportService } from '@src/domains/Report/services/report-export.service';
import { StockService } from '@src/domains/Stock/services/stock.service';
import { ProductService } from '@src/domains/Product/services/product.service';
import { TelegramBotService } from '@src/domains/Telegram/services/telegram-bot.service';
import { eventBus } from '@src/shared/events/event-bus';
import {
  TelegramConfig,
  TelegramConfigInput,
  TelegramConfigResponse,
  TestConnectionResponse,
  SendReportResponse,
  TelegramAPIError,
  TelegramMessageResponse,
} from '@src/domains/Telegram/types/telegram.types';
import { DailySalesReportResponse } from '@src/domains/Report/types/report.types';
import { GetProductResponse } from '@src/domains/Product/types/product.types';
import { GetStockByProductResponse } from '@src/domains/Stock/types/stock.types';
import { auditLogService } from '@src/shared/services/audit-log.service';
import { Role } from '@src/shared/config/permissions';
import path from 'path';
import fs from 'fs/promises';

export class TelegramService {

  // Track sent alerts to prevent spam
  private static readonly BASE_URL = 'https://api.telegram.org/bot';
  private static sentAlerts = new Map<string, number>();
  private static normalizeTestStatus(
    status: string | null
  ): 'SUCCESS' | 'FAILED' | null {
    return status === 'SUCCESS' || status === 'FAILED' ? status : null;
  }

  private static buildTelegramAdminWebhookUrl(): string | null {
    const baseUrl = env.API_BASE_URL || env.APP_URL;
    if (!baseUrl) {
      return null;
    }
    const trimmedBase = baseUrl.replace(/\/+$/, '');
    return `${trimmedBase}/api/v1/telegram-admin-bot/webhook/1`;
  }

  public static async registerAdminWebhook(botToken: string, isActive: boolean): Promise<any> {
    if (!isActive) {
      return null;
    }

    const webhookUrl = this.buildTelegramAdminWebhookUrl();
    if (!webhookUrl) {
      logger.warn(
        'Skipping automatic Telegram webhook registration because API_BASE_URL or APP_URL is not configured'
      );
      return null;
    }

    const maxRetries = 3;
    let lastError: any;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        // Get bot info first to verify token
        const botInfo = await TelegramBotService.getMe(botToken);

        await TelegramBotService.setWebhook(
          botToken,
          webhookUrl,
          process.env.TELEGRAM_WEBHOOK_SECRET
        );

        logger.info('Telegram admin webhook registered successfully', {
          webhookUrl,
          botName: botInfo.first_name,
          attempt
        });

        return botInfo;
      } catch (error: any) {
        lastError = error;
        const isTelegramError = error instanceof TelegramAPIError;

        logger.warn(`Failed to register Telegram webhook (Attempt ${attempt}/${maxRetries})`, {
          webhookUrl,
          error: error.message,
          errorCode: isTelegramError ? error.errorCode : undefined,
          description: isTelegramError ? error.message : undefined
        });

        if (attempt < maxRetries) {
          // Wait before next attempt (1s, 2s, 3s)
          await new Promise(resolve => setTimeout(resolve, attempt * 1000));
        }
      }
    }

    throw lastError;
  }

  /**
   * Configure Telegram bot
   */
  static async configureTelegram(
    config: TelegramConfigInput,
    userId: number,
    tenantId?: number
  ): Promise<TelegramConfigResponse> {
    // Check if config exists (as multi-tenancy is removed, we only check for a single configuration)
    const existingConfig = await prisma.telegramConfig.findFirst();

    let finalBotToken = config.bot_token;
    if (config.bot_token.includes('••••')) {
      if (!existingConfig) {
        throw new Error('Cannot use placeholder bot token when no Telegram configuration exists');
      }
      try {
        finalBotToken = decrypt(existingConfig.botToken, process.env.ENCRYPTION_KEY!);
      } catch {
        finalBotToken = existingConfig.botToken;
      }
    }

    // Encrypt bot token before storing
    const encryptedToken = encrypt(finalBotToken, process.env.ENCRYPTION_KEY!);

    if (existingConfig) {
      // Update existing config
      const updated = await prisma.telegramConfig.update({
        where: { configId: existingConfig.configId },
        data: {
          botToken: encryptedToken,
          groupChatId: config.group_chat_id,
          isActive: config.is_active ?? true,
          updatedBy: userId,
          updatedAt: new Date()
        }
      });

      const response = {
        config_id: updated.configId,
        is_active: updated.isActive,
        last_test_time: updated.lastTestTime?.toISOString(),
        last_test_status: this.normalizeTestStatus(updated.lastTestStatus)
      };
      eventBus.emit('telegram.config-updated', {
        config_id: updated.configId,
        is_active: updated.isActive,
        updated_by: userId,
        updated_at: updated.updatedAt,
      });
      await this.registerAdminWebhook(finalBotToken, updated.isActive);
      return response;
    } else {
      // Create new config
      const created = await prisma.telegramConfig.create({
        data: {
          botToken: encryptedToken,
          groupChatId: config.group_chat_id,
          isActive: config.is_active ?? true,
          createdBy: userId,
          updatedBy: userId
        }
      });

      const response = {
        config_id: created.configId,
        is_active: created.isActive,
        last_test_time: null,
        last_test_status: null
      };
      eventBus.emit('telegram.config-updated', {
        config_id: created.configId,
        is_active: created.isActive,
        updated_by: userId,
        updated_at: created.updatedAt,
      });
      await this.registerAdminWebhook(finalBotToken, created.isActive);
      return response;
    }
  }

  /**
   * Get Telegram configuration
   */
  static async getTelegramConfig(tenantId?: number): Promise<TelegramConfig | null> {
    const config = await prisma.telegramConfig.findFirst({
      where: {
        isActive: true,
      }
    });

    if (!config) {
      return null;
    }

    // Decrypt bot token (fallback to raw string if unencrypted placeholder)
    let decryptedToken = config.botToken;
    try {
      if (process.env.ENCRYPTION_KEY) {
        decryptedToken = decrypt(config.botToken, process.env.ENCRYPTION_KEY);
      }
    } catch {
      decryptedToken = config.botToken;
    }

    return {
      config_id: config.configId,
      bot_token: decryptedToken,
      group_chat_id: config.groupChatId,
      is_active: config.isActive,
      last_test_time: config.lastTestTime?.toISOString(),
      last_test_status: this.normalizeTestStatus(config.lastTestStatus)
    };
  }

  private static async getActiveConfigOrThrow(tenantId?: number): Promise<TelegramConfig> {
    const config = await this.getTelegramConfig(tenantId);
    if (!config || !config.is_active) {
      throw new Error('Telegram not configured or disabled');
    }
    return config;
  }

  private static async sendMessageWithMarkup(
    botToken: string,
    chatId: number | string,
    text: string,
    parseMode: 'Markdown' | 'HTML' = 'Markdown',
    replyMarkup?: Record<string, unknown>
  ): Promise<TelegramMessageResponse> {
    try {
      const response = await axios.post(
        `${this.BASE_URL}${botToken}/sendMessage`,
        {
          chat_id: chatId,
          text,
          parse_mode: parseMode,
          reply_markup: replyMarkup,
        },
        {
          timeout: 10000,
        }
      );

      return {
        success: true,
        messageId: response.data.result.message_id,
        sentAt: new Date(response.data.result.date * 1000),
      };
    } catch (error: any) {
      if (error.response) {
        throw new TelegramAPIError(
          error.response.data.error_code,
          error.response.data.description
        );
      }
      throw new TelegramAPIError(0, error.message);
    }
  }

  private static async editMessageWithMarkup(
    botToken: string,
    chatId: number | string,
    messageId: number,
    text: string,
    parseMode: 'Markdown' | 'HTML' = 'Markdown',
    replyMarkup?: Record<string, unknown>
  ): Promise<TelegramMessageResponse> {
    try {
      const response = await axios.post(
        `${this.BASE_URL}${botToken}/editMessageText`,
        {
          chat_id: chatId,
          message_id: messageId,
          text,
          parse_mode: parseMode,
          reply_markup: replyMarkup,
        },
        { timeout: 10000 }
      );

      return {
        success: true,
        messageId: response.data.result.message_id,
        sentAt: new Date(response.data.result.date * 1000),
      };
    } catch (error: any) {
      if (error.response) {
        throw new TelegramAPIError(
          error.response.data.error_code,
          error.response.data.description
        );
      }
      throw new TelegramAPIError(0, error.message);
    }
  }

  static async sendMessageByChatId(
    tenantId: number | undefined,
    chatId: number | string,
    text: string,
    parseMode: 'Markdown' | 'HTML' = 'Markdown',
    replyMarkup?: Record<string, unknown>
  ): Promise<TelegramMessageResponse> {
    const config = await this.getActiveConfigOrThrow(tenantId);
    if (replyMarkup) {
      return this.sendMessageWithMarkup(
        config.bot_token,
        chatId,
        text,
        parseMode,
        replyMarkup
      );
    }
    return TelegramBotService.sendMessage(
      config.bot_token,
      String(chatId),
      text,
      parseMode
    );
  }

  static async sendCustomMessage(
    textOrTenantId: string | number,
    parseModeOrText?: string,
    maybeParseMode?: 'Markdown' | 'HTML'
  ): Promise<TelegramMessageResponse> {
    let text: string;
    let parseMode: 'Markdown' | 'HTML' = 'Markdown';

    if (typeof textOrTenantId === 'number') {
      text = parseModeOrText || '';
      parseMode = (maybeParseMode as 'Markdown' | 'HTML') || 'Markdown';
    } else {
      text = textOrTenantId;
      parseMode = (parseModeOrText as 'Markdown' | 'HTML') || 'Markdown';
    }

    const config = await this.getActiveConfigOrThrow();
    return TelegramBotService.sendMessage(
      config.bot_token,
      config.group_chat_id,
      text,
      parseMode
    );
  }

  static async sendMenuMessage(
    tenantId: number | undefined,
    chatId: number | string,
    text: string,
    replyMarkup: Record<string, unknown>,
    parseMode: 'Markdown' | 'HTML' = 'Markdown'
  ): Promise<TelegramMessageResponse> {
    const config = await this.getActiveConfigOrThrow(tenantId);
    return this.sendMessageWithMarkup(
      config.bot_token,
      chatId,
      text,
      parseMode,
      replyMarkup
    );
  }

  static async editMenuMessage(
    tenantId: number | undefined,
    chatId: number | string,
    messageId: number,
    text: string,
    replyMarkup: Record<string, unknown>,
    parseMode: 'Markdown' | 'HTML' = 'Markdown'
  ): Promise<TelegramMessageResponse> {
    const config = await this.getActiveConfigOrThrow(tenantId);
    return this.editMessageWithMarkup(
      config.bot_token,
      chatId,
      messageId,
      text,
      parseMode,
      replyMarkup
    );
  }

  static async editMessageByChatId(
    tenantId: number | undefined,
    chatId: number | string,
    messageId: number,
    text: string,
    parseMode: 'Markdown' | 'HTML' = 'Markdown',
    replyMarkup?: Record<string, unknown>
  ): Promise<TelegramMessageResponse> {
    const config = await this.getActiveConfigOrThrow(tenantId);
    return this.editMessageWithMarkup(
      config.bot_token,
      chatId,
      messageId,
      text,
      parseMode,
      replyMarkup
    );
  }

  static async sendConfirmKeyboard(
    tenantId: number | undefined,
    chatId: number | string,
    action: string
  ): Promise<TelegramMessageResponse> {
    const config = await this.getActiveConfigOrThrow(tenantId);
    const replyMarkup = {
      inline_keyboard: [
        [
          { text: 'Confirm', callback_data: `CONFIRM:${action}` },
          { text: 'Cancel', callback_data: 'CONFIRM:CANCEL' },
        ],
      ],
    };
    return this.sendMessageWithMarkup(
      config.bot_token,
      chatId,
      'Please confirm this action.',
      'Markdown',
      replyMarkup
    );
  }

  static async answerCallback(
    tenantId: number | undefined,
    callbackQueryId: string,
    message = 'OK'
  ): Promise<void> {
    const config = await this.getActiveConfigOrThrow(tenantId);
    try {
      await axios.post(
        `${this.BASE_URL}${config.bot_token}/answerCallbackQuery`,
        {
          callback_query_id: callbackQueryId,
          text: message,
        },
        { timeout: 10000 }
      );
    } catch (error: any) {
      if (error.response) {
        throw new TelegramAPIError(
          error.response.data.error_code,
          error.response.data.description
        );
      }
      throw new TelegramAPIError(0, error.message);
    }
  }

  /**
   * Test Telegram connection
   */
  static async testConnection(
    tenantId?: number,
    botToken?: string,
    groupChatId?: string
  ): Promise<TestConnectionResponse> {
    // Use provided token/chatId or get from config
    const useStoredConfig = !(botToken && groupChatId);
    const config = useStoredConfig
      ? await this.getTelegramConfig(tenantId)
      : { bot_token: botToken!, group_chat_id: groupChatId! };
    const storedConfig = useStoredConfig ? (config as TelegramConfig) : null;

    if (!config) {
      throw new Error('Telegram not configured');
    }

    try {
      // Test bot token
      await TelegramBotService.getMe(config.bot_token);

      // Send test message
      const result = await TelegramBotService.sendMessage(
        config.bot_token,
        config.group_chat_id,
        'Telegram integration test successful!'
      );

      // Update last test time and status
      if (storedConfig) {
        await prisma.telegramConfig.updateMany({
          where: { configId: storedConfig.config_id },
          data: {
            lastTestTime: new Date(),
            lastTestStatus: 'SUCCESS'
          }
        });
      }

      return {
        status: 'SUCCESS',
        message: 'Test message sent successfully'
      };
    } catch (error) {
      // Update last test status
      if (storedConfig) {
        await prisma.telegramConfig.updateMany({
          where: { configId: storedConfig.config_id },
          data: {
            lastTestTime: new Date(),
            lastTestStatus: 'FAILED'
          }
        });
      }

      throw error;
    }
  }

  /**
   * Send daily report for all sellers (today)
   */
  static async sendDailyAggregateReport(
    date: string,
    currentUserId: number,
    tenantId?: number,
    bypassCache: boolean = false
  ): Promise<SendReportResponse> {
    const config = await this.getTelegramConfig(tenantId);
    if (!config || !config.is_active) {
      throw new Error('Telegram not configured or disabled');
    }

    const report = await ReportService.getDailyReport(
      { date, bypass_cache: bypassCache },
      currentUserId,
      Role.ADMIN
    );

    const fileName = `daily_report_${date.replace(/-/g, '')}_${Date.now()}`;
    const mapStockStatus = (status: string) =>
      status === 'out_of_stock' ? 'អស់ស្តុក' : 'ស្តុកទាប';

    const topProductsRows = report.top_products.map((p) => ({
      លេខផលិតផល: p.product_id,
      ឈ្មោះផលិតផល: p.product_name,
      កូដផលិតផល: p.product_code,
      បរិមាណលក់: p.quantity_sold,
      ចំណូល: p.revenue,
      តម្លៃមធ្យម: p.average_price,
    }));
    const lowStockRows = report.low_stock_items.map((item) => ({
      លេខផលិតផល: item.product_id,
      ឈ្មោះផលិតផល: item.product_name,
      កូដផលិតផល: item.product_code,
      ស្តុកបច្ចុប្បន្ន: item.current_stock,
      ខ្ពស់បំផុតស្តុកទាប: item.low_stock_threshold,
      ស្ថានភាព: mapStockStatus(item.status),
      កែប្រែចុងក្រោយ: item.last_updated,
    }));
    const excelName = await ReportExportService.exportXLSX(
      {
        សង្ខេប: [
          {
            កាលបរិច្ឆេទ: report.date,
            ចំនួនទឹកប្រាក់សរុប: report.total_sales,
            ការបញ្ជាទិញសរុប: report.total_orders,
            ចំនួនវេនសរុប: report.total_shifts,
            មធ្យមភាគក្នុងការកម្មង់: report.average_order_value,
            រូបិយប័ណ្ណ: report.currency,
            សរុបផលិតផលលក់: report.summary.total_products_sold,
            عددផលិតផលខុសគ្នាលក់: report.summary.unique_products_sold,
            មធ្យមភាគទំនិញក្នុងបញ្ជាទិញ: report.summary.average_items_per_order,
            សាច់ប្រាក់ប្រមូលបាន: report.summary.cash_collected,
            ខ្វះឬលើសសរុប: report.summary.short_over_amount,
          },
        ],
        វេនការងារ: report.shifts_breakdown.map((s) => ({
          លេខអ្នកលក់: s.seller_id,
          អ្នកលក់: s.seller_name,
          ចំនួនវេន: s.shift_count,
          ចំនួនទឹកប្រាក់សរុប: s.total_sales,
          ការបញ្ជាទិញសរុប: s.total_orders,
          ម៉ោងចាប់ផ្តើម: s.start_time,
          ម៉ោងបញ្ចប់: s.end_time,
        })),
        ផលិតផលលក់ដាច់: topProductsRows.length
          ? topProductsRows
          : [
            {
              លេខផលិតផល: '',
              ឈ្មោះផលិតផល: '',
              កូដផលិតផល: '',
              បរិមាណលក់: '',
              ចំណូល: '',
              តម្លៃមធ្យម: '',
            },
          ],
        ទំនិញស្តុកទាប: lowStockRows.length
          ? lowStockRows
          : [
            {
              លេខផលិតផល: '',
              ឈ្មោះផលិតផល: '',
              កូដផលិតផល: '',
              ស្តុកបច្ចុប្បន្ន: '',
              ខ្ពស់បំផុតស្តុកទាប: '',
              ស្ថានភាព: '',
              កែប្រែចុងក្រោយ: '',
            },
          ],
      },
      fileName
    );

    const filePath = path.join('/tmp', excelName);
    const caption = `📊 របាយការណ៍លក់ប្រចាំថ្ងៃ (${report.date})`;
    const result = await TelegramBotService.sendDocument(
      config.bot_token,
      config.group_chat_id,
      filePath,
      caption
    );

    const response = {
      sent: true,
      message_id: result.messageId,
      sent_at: result.sentAt.toISOString(),
      report: {
        date: report.date,
        total_sales: report.total_sales,
        total_orders: report.total_orders,
        total_shifts: report.total_shifts,
        average_order_value: report.average_order_value,
        currency: report.currency,
        shifts: report.shifts_breakdown,
        top_products: report.top_products,
        low_stock_items: report.low_stock_items,
        summary: report.summary,
        metadata: report.metadata,
      },
    };

    await auditLogService.createAuditLog({
      userId: currentUserId,
      action: 'TELEGRAM_REPORT_SENT',
      resource: 'Telegram',
      entityType: 'Report',
      details: {
        date,
        scope: 'ALL_SELLERS',
        message_id: result.messageId,
        sent_at: result.sentAt,
      },
    });

    await fs.unlink(filePath).catch(() => undefined);

    return response;
  }

  /**
   * Send low stock alert
   */
  static async sendLowStockAlert(productId: number, tenantId?: number): Promise<void> {
    // 1. Get Telegram config
    const config = await this.getTelegramConfig(tenantId);
    if (!config || !config.is_active) {
      return; // Silently fail if not configured
    }

    // 2. Get product and stock
    const product = await ProductService.getProduct(productId, 0);
    const stockResponse = await StockService.getStock({ product_id: productId }, 0);

    if (!product || !('stock_id' in stockResponse)) {
      return;
    }

    const stock = stockResponse;

    // 3. Check if stock is low
    if (product.low_stock_threshold == null) {
      return; // No threshold configured
    }
    if (stock.quantity > product.low_stock_threshold) {
      return; // Not low stock
    }

    // 4. Check if alert already sent (deduplication)
    const alertKey = `${productId}_${stock.quantity}`;
    if (this.sentAlerts.has(alertKey)) {
      return; // Already sent
    }

    // 5. Format alert message
    const message = await this.formatLowStockAlertForTelegram(product, stock);

    // 6. Send to Telegram
    try {
      await TelegramBotService.sendMessage(
        config.bot_token,
        config.group_chat_id,
        message
      );

      // 7. Mark as sent (expires after 24 hours)
      this.sentAlerts.set(alertKey, Date.now());
      setTimeout(() => {
        this.sentAlerts.delete(alertKey);
      }, 24 * 60 * 60 * 1000); // 24 hours
      eventBus.emit('telegram.alert-sent', {
        product_id: productId,
        quantity: stock.quantity,
        sent_at: new Date(),
      });
      await auditLogService.createAuditLog({
        action: 'TELEGRAM_ALERT_SENT',
        resource: 'Telegram',
        entityType: 'Product',
        entityId: productId,
        details: {
          quantity: stock.quantity,
          threshold: product.low_stock_threshold,
          status: stock.quantity === 0 ? 'OUT_OF_STOCK' : 'LOW_STOCK',
        },
      });
    } catch (error: any) {
      await auditLogService.createAuditLog({
        action: 'TELEGRAM_ALERT_FAILED',
        resource: 'Telegram',
        entityType: 'Product',
        entityId: productId,
        details: {
          error: error.message,
          quantity: stock.quantity,
          threshold: product.low_stock_threshold,
        },
      });
      logger.error('Failed to send low stock alert', { productId, error: error.message });
    }
  }

  /**
   * Send low stock alerts for all products that meet the threshold
   */
  static async sendLowStockAlertsForAll(): Promise<void> {
    const config = await this.getTelegramConfig();
    if (!config || !config.is_active) {
      return;
    }

    const lowStockItems = await prisma.stock.findMany({
      where: {
        product: {
          deactivatedDate: null,
          lowStockThreshold: {
            not: null,
            gt: 0,
          },
        },
      },
      include: {
        product: true,
      },
    });

    const thresholdMatches = lowStockItems.filter(
      (item) => item.quantity <= (item.product.lowStockThreshold ?? 0)
    );

    for (const item of thresholdMatches) {
      try {
        await this.sendLowStockAlert(item.productId);
      } catch (error: any) {
        logger.error('Failed to send low stock alert during global check', {
          product_id: item.productId,
          error: error.message,
        });
      }
    }
  }

  /**
   * Format low stock alert for Telegram
   */
  static async formatLowStockAlertForTelegram(
    product: GetProductResponse,
    stock: GetStockByProductResponse
  ): Promise<string> {
    const status = stock.quantity === 0 ? 'អស់ពីស្តុក' : 'ជិតអស់ពីស្តុក';

    return `⚠️ *ការជូនដំណឹង: ទំនិញជិតអស់ពីស្តុក*

            ឈ្មោះទំនិញ៖ ${product.product_name}
            ចំនួនក្នុងស្តុកបច្ចុប្បន្ន៖ ${stock.quantity}
            ចំនួនកំណត់ទាបបំផុត៖ ${product.low_stock_threshold}
            ស្ថានភាព៖ ${status}
        `;
  }

  /**
   * Delete a message by its ID
   */
  static async deleteMessage(
    tenantId: number | undefined,
    chatId: number | string,
    messageId: number
  ): Promise<boolean> {
    try {
      const config = await this.getActiveConfigOrThrow(tenantId);
      return await TelegramBotService.deleteMessage(
        config.bot_token,
        String(chatId),
        messageId
      );
    } catch (error: any) {
      logger.warn('Failed to delete message via TelegramService', {
        tenantId,
        chatId,
        messageId,
        error: error.message,
      });
      return false;
    }
  }
}
