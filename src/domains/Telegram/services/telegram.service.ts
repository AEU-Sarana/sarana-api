import  prisma  from '@src/database/client';
import { encrypt, decrypt } from '@src/shared/utils/encryption';
import { logger } from '@src/shared/utils/logger';
import { ReportService } from '@src/domains/Report/services/report.service';
import { ShiftService } from '@src/domains/Shift/services/shift.service';
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
} from '@src/domains/Telegram/types/telegram.types';
import { DailySalesReportResponse } from '@src/domains/Report/types/report.types';
import { GetShiftResponse } from '@src/domains/Shift/types/shift.types';
import { GetProductResponse } from '@src/domains/Product/types/product.types';
import { GetStockByProductResponse } from '@src/domains/Stock/types/stock.types';

export class TelegramService {

  // Track sent alerts to prevent spam
  private static sentAlerts = new Map<string, number>();
  private static normalizeTestStatus(
    status: string | null
  ): 'SUCCESS' | 'FAILED' | null {
    return status === 'SUCCESS' || status === 'FAILED' ? status : null;
  }

  private static async updateShiftReportStatus(
    shiftId: number,
    status: 'SENT' | 'FAILED'
  ): Promise<void> {
    await prisma.shift.update({
      where: { shiftId },
      data: { reportSentStatus: status },
    });
  }

  /**
   * Configure Telegram bot
   */
  static async configureTelegram(
    config: TelegramConfigInput,
    userId: number
  ): Promise<TelegramConfigResponse> {
    // Encrypt bot token before storing
    const encryptedToken = encrypt(config.bot_token, process.env.ENCRYPTION_KEY!);
    
    // Check if config exists
    const existingConfig = await prisma.telegramConfig.findFirst();
    
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
      return response;
    }
  }
  
  /**
   * Get Telegram configuration
   */
  static async getTelegramConfig(): Promise<TelegramConfig | null> {
    const config = await prisma.telegramConfig.findFirst({
      where: { isActive: true }
    });
    
    if (!config) {
      return null;
    }
    
    // Decrypt bot token
    const decryptedToken = decrypt(config.botToken, process.env.ENCRYPTION_KEY!);
    
    return {
      config_id: config.configId,
      bot_token: decryptedToken,
      group_chat_id: config.groupChatId,
      is_active: config.isActive,
      last_test_time: config.lastTestTime?.toISOString(),
      last_test_status: this.normalizeTestStatus(config.lastTestStatus)
    };
  }
  
  /**
   * Test Telegram connection
   */
  static async testConnection(
    botToken?: string,
    groupChatId?: string
  ): Promise<TestConnectionResponse> {
    // Use provided token/chatId or get from config
    const useStoredConfig = !(botToken && groupChatId);
    const config = useStoredConfig
      ? await this.getTelegramConfig()
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
        '✅ Telegram integration test successful!'
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
   * Send daily report to Telegram
   */
  static async sendDailyReport(
    shiftId: number,
    currentUserId: number,
    currentUserRole: string
  ): Promise<SendReportResponse> {
    // 1. Get Telegram config
    const config = await this.getTelegramConfig();
    if (!config || !config.is_active) {
      throw new Error('Telegram not configured or disabled');
    }
    
    // 2. Get shift data
    const shift = await ShiftService.getShift(shiftId, currentUserId, currentUserRole);
    if (!shift) {
      throw new Error('Shift not found');
    }
    
    // 3. Generate daily report
    const report = await ReportService.getDailyReport(
      { date: shift.shift_date, seller_id: shift.seller_id },
      currentUserId
    );
    
    // 4. Format report for Telegram
    const message = await this.formatDailyReportForTelegram(report, shift);
    
    // 5. Send to Telegram
    try {
      const result = await TelegramBotService.sendMessage(
        config.bot_token,
        config.group_chat_id,
        message,
        'Markdown'
      );
      
      // 6. Update shift report status
      await this.updateShiftReportStatus(shiftId, 'SENT');
      
      const response = {
        sent: true,
        message_id: result.messageId,
        sent_at: result.sentAt.toISOString()
      };
      eventBus.emit('telegram.report-sent', {
        shift_id: shiftId,
        message_id: result.messageId,
        sent_at: result.sentAt,
        sent_by: currentUserId,
      });
      return response;
    } catch (error) {
      // Update shift report status as failed
      await this.updateShiftReportStatus(shiftId, 'FAILED');
      
      throw error;
    }
  }
  
  /**
   * Format daily report for Telegram
   */
  static async formatDailyReportForTelegram(
    report: DailySalesReportResponse,
    shift: GetShiftResponse
  ): Promise<string> {
    const formatTime = (date: Date | null) => {
      if (!date) return '-';
      return new Date(date).toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
      });
    };
    
    const calculateDuration = (start: Date, end: Date | null) => {
      if (!end) return 0;
      const diff = end.getTime() - start.getTime();
      return Math.round(diff / (1000 * 60 * 60)); // hours
    };
    
    const shortOver = (shift.actual_cash ?? 0) - (shift.expected_cash ?? 0);
    const shortOverText = shortOver >= 0
      ? `+$${shortOver.toFixed(2)}`
      : `-$${Math.abs(shortOver).toFixed(2)}`;
    
    let message = `📊 *Daily Sales Report*
                    ━━━━━━━━━━━━━━━━━━━━
                    📅 Date: ${report.date}
                    👤 Seller: ${shift.seller_name ?? '-'}

                    💰 *Sales Summary*
                    • Total Orders: ${report.total_orders}
                    • Total Amount: $${report.total_sales.toFixed(2)}
                    • Average Order: $${report.average_order_value.toFixed(2)}

                    💵 *Cash Summary*
                    • Opening Cash: $${shift.opening_cash.toFixed(2)}
                    • Expected Cash: $${(shift.expected_cash ?? 0).toFixed(2)}
                    • Actual Cash: $${(shift.actual_cash ?? 0).toFixed(2)}
                    • Short/Over: ${shortOverText}

                    ⏰ *Shift Details*
                    • Start: ${formatTime(shift.start_time)}
                    • End: ${formatTime(shift.end_time)}
                    • Duration: ${calculateDuration(shift.start_time, shift.end_time)} hours
                `;
    
    return message;
  }
  
  /**
   * Resend failed report
   */
  static async resendReport(
    shiftId: number,
    currentUserId: number,
    currentUserRole: string
  ): Promise<SendReportResponse> {
    // Check if shift exists and report status is FAILED
    const shift = await ShiftService.getShift(shiftId, currentUserId, currentUserRole);
    if (!shift) {
      throw new Error('Shift not found');
    }
    
    if (shift.report_sent_status === 'SENT') {
      throw new Error('Report already sent');
    }
    
    // Resend report
    return await this.sendDailyReport(shiftId, currentUserId, currentUserRole);
  }

  /**
   * Send low stock alert
   */
  static async sendLowStockAlert(productId: number): Promise<void> {
    // 1. Get Telegram config
    const config = await this.getTelegramConfig();
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
    } catch (error: any) {
      logger.error('Failed to send low stock alert', { productId, error: error.message });
      // Don't throw - alert failure shouldn't break stock operations
    }
  }
  
  /**
   * Format low stock alert for Telegram
   */
  static async formatLowStockAlertForTelegram(
    product: GetProductResponse,
    stock: GetStockByProductResponse
  ): Promise<string> {
    const status = stock.quantity === 0 ? 'OUT OF STOCK' : 'LOW STOCK';
    
    return `⚠️ *Low Stock Alert*

            Product: ${product.product_name}
            Current Stock: ${stock.quantity}
            Threshold: ${product.low_stock_threshold}
            Status: ${status}
        `;
  }
}