import prisma from '@src/database/client';
import { Prisma } from '@src/database/generated';
import { ReportExportService } from '@src/domains/Report/services/report-export.service';
import { formatDate } from '@src/shared/utils/date-utils';
import { startOfDay, startOfWeek, startOfMonth, differenceInCalendarDays } from 'date-fns';
import { TelegramService } from '@src/domains/Telegram/services/telegram.service';
import { TelegramBotService } from '@src/domains/Telegram/services/telegram-bot.service';
import { MENU_DEFS, NAV_ROW, NAV_EXPORT_EXCEL, NAV_EXPORT_SALES_RANK } from '@src/domains/Telegram/menu/menu-registry';
import axios from 'axios';
import fs from 'fs/promises';
import { createWriteStream } from 'fs';
import path from 'path';
import type { AdminExportRange, AdminExportType, AdminExportRestoreMenu } from '@src/domains/TelegramAdminBot/types/telegram-admin-export.types';

const DEFAULT_TIMEZONE = 'Asia/Phnom_Penh';

export class TelegramAdminExcelExportService {
  static getCacheKey(exportType: AdminExportType, range?: AdminExportRange, timezone = DEFAULT_TIMEZONE) {
    const keyRange = range ?? 'all';
    const dateKey = this.getDateKey(range, timezone);
    return `cache:admin_export:${exportType}:${keyRange}:${dateKey}`;
  }

  static buildRetryCallback(exportType: AdminExportType, range?: AdminExportRange) {
    if (exportType === 'STOCK_ALL') return 'EXPORT_EXCEL_STOCK_ALL';
    return `EXPORT_EXCEL_SALES_RANK:${range ?? 'all'}`;
  }

  static async editProcessingMessage(
    tenantId: number,
    chatId: number,
    messageId: number,
    text: string,
    restoreMenu?: AdminExportRestoreMenu,
    options?: { retryCallback?: string }
  ) {
    const replyMarkup = this.buildRestoreKeyboard(restoreMenu, options?.retryCallback);
    try {
      return await TelegramService.editMessageByChatId(tenantId, chatId, messageId, text, 'Markdown', replyMarkup);
    } catch (error: any) {
      const message = String(error?.message || '');
      if (message.includes('message is not modified')) {
        return;
      }
      throw error;
    }
  }

  static buildRestoreKeyboard(restoreMenu?: AdminExportRestoreMenu, retryCallback?: string) {
    if (retryCallback) {
      return {
        inline_keyboard: [
          [{ text: '🔁 Retry', callback_data: retryCallback }],
          [{ text: '⬅️ ត្រឡប់ក្រោយ', callback_data: restoreMenu === 'sales_rank' ? NAV_EXPORT_SALES_RANK : NAV_EXPORT_EXCEL }],
        ],
      };
    }

    if (restoreMenu === 'sales_rank') {
      const def = MENU_DEFS.export_sales_rank;
      const rows = def.buildButtons();
      return { inline_keyboard: [...rows, NAV_ROW] };
    }

    if (restoreMenu === 'export') {
      const def = MENU_DEFS.export_excel;
      const rows = def.buildButtons();
      return { inline_keyboard: [...rows, NAV_ROW] };
    }

    return undefined;
  }

  static async sendDocumentByUrl(tenantId: number, chatId: number, url: string, fileName?: string) {
    const config = await TelegramService.getTelegramConfig(tenantId);
    if (!config) throw new Error('Telegram not configured');
    try {
      return await TelegramBotService.sendDocument(
        config.bot_token,
        String(chatId),
        url,
        fileName ? `📎 ${fileName}` : undefined
      );
    } catch (error: any) {
      const message = String(error?.message || '');
      if (!message.includes('wrong type of the web page content')) {
        throw error;
      }
      const localPath = await this.downloadToTemp(url, fileName);
      try {
        return await TelegramBotService.sendDocument(
          config.bot_token,
          String(chatId),
          localPath,
          fileName ? `📎 ${fileName}` : undefined
        );
      } finally {
        try {
          await fs.unlink(localPath);
        } catch { }
      }
    }
  }

  static async sendDocumentByLocalPath(tenantId: number, chatId: number, filePath: string, fileName?: string) {
    const config = await TelegramService.getTelegramConfig(tenantId);
    if (!config) throw new Error('Telegram not configured');
    return TelegramBotService.sendDocument(
      config.bot_token,
      String(chatId),
      filePath,
      fileName ? `📎 ${fileName}` : undefined
    );
  }

  private static async downloadToTemp(url: string, fileName?: string) {
    const safeName = fileName ?? path.basename(url.split('?')[0] || 'export.xlsx');
    const targetPath = path.join('/tmp', `tg_export_${Date.now()}_${safeName}`);
    const response = await axios.get(url, { responseType: 'stream' });
    await new Promise<void>((resolve, reject) => {
      const writer = createWriteStream(targetPath);
      response.data.pipe(writer);
      writer.on('finish', resolve);
      writer.on('error', reject);
    });
    return targetPath;
  }

  static async generateExportFile(params: {
    exportType: AdminExportType;
    range?: AdminExportRange;
    timezone?: string;
    requestedByUserId: number;
    tenantId: number;
  }) {
    if (params.exportType === 'STOCK_ALL') {
      return this.exportStockAll(params.requestedByUserId, params.tenantId);
    }
    return this.exportSalesRanking(params.range ?? 'all', params.tenantId, params.timezone);
  }

  static async exportStockAll(requestedByUserId: number, tenantId: number) {
    const tQueryStart = Date.now();
    const rows = await prisma.$queryRaw<
      {
        product_id: number;
        product_code: string;
        barcode: string | null;
        product_name: string;
        category: string | null;
        quantity: number | null;
        reorder_point: number | null;
        low_stock_threshold: number | null;
        price: any;
        avg_cost: any;
        updated_at: Date;
      }[]
    >`
      SELECT
        p.product_id,
        p.product_code,
        p.barcode,
        p.product_name,
        p.category,
        s.quantity,
        p.reorder_point,
        p.low_stock_threshold,
        p.price,
        p.avg_cost,
        p.updated_at
      FROM products p
      INNER JOIN users u ON u.user_id = p.created_by_user_id
      LEFT JOIN stocks s ON s.product_id = p.product_id
      WHERE p.status = 'active' AND u.tenant_id = ${tenantId}
      ORDER BY p.product_name ASC
    `;

    const lots = await prisma.$queryRaw<
      {
        lot_id: number;
        product_name: string;
        product_code: string | null;
        qty_on_hand: number;
        received_at: Date;
        expired_at: Date | null;
      }[]
    >`
      SELECT
        sl.id AS lot_id,
        p.product_name,
        p.product_code,
        sl.qty_on_hand,
        sl.received_at,
        sl.expired_at
      FROM stock_lots sl
      JOIN products p ON p.product_id = sl.product_id
      JOIN users u ON u.user_id = p.created_by_user_id
      WHERE sl.qty_on_hand > 0
        AND sl.expired_at IS NOT NULL
        AND u.tenant_id = ${tenantId}
      ORDER BY sl.expired_at ASC, sl.received_at ASC
    `;

    const tQueryMs = Date.now() - tQueryStart;

    const data = rows.map((row, index) => {
      const qty = Number(row.quantity || 0);
      const low = row.low_stock_threshold ?? 0;
      const status = qty <= 0 ? 'OUT' : qty <= low ? 'LOW' : 'OK';
      return {
        Rank: index + 1,
        'Product Code': row.product_code,
        Barcode: row.barcode ?? '-',
        'Product Name': row.product_name,
        Category: row.category ?? '-',
        'Qty On Hand': qty,
        'Reorder Point': Number(row.reorder_point || 0),
        'Low Stock Threshold': Number(low || 0),
        'Stock Status': status,
        Price: Number(row.price || 0),
        'Avg Cost': Number(row.avg_cost || 0),
        'Updated At': row.updated_at ? formatDate(row.updated_at) : '-'
      };
    });

    const lotsData = lots.map((lot, index) => {
      const daysToExpire = lot.expired_at
        ? differenceInCalendarDays(new Date(lot.expired_at), new Date())
        : null;
      const status = daysToExpire === null
        ? 'NO_EXPIRY'
        : daysToExpire < 0
          ? 'EXPIRED'
          : daysToExpire <= 7
            ? 'NEAR'
            : 'OK';
      return {
        Rank: index + 1,
        Product: lot.product_name,
        'Product Code': lot.product_code ?? '-',
        'Lot ID': lot.lot_id,
        Qty: Number(lot.qty_on_hand || 0),
        'Received At': lot.received_at ? formatDate(lot.received_at) : '-',
        'Expired At': lot.expired_at ? formatDate(lot.expired_at) : '-',
        'Days To Expire': daysToExpire !== null ? daysToExpire : '-',
        Status: status,
      };
    });

    const sheets: Record<string, any[]> = { Stock: data };
    if (lotsData.length) {
      sheets['Expiry Lots'] = lotsData;
    }

    const tExportStart = Date.now();
    const fileName = `stock_all_${Date.now()}`;
    const finalFileName = await ReportExportService.exportXLSX(sheets, fileName);
    const tExportMs = Date.now() - tExportStart;

    return { fileName: finalFileName, t_query_ms: tQueryMs, t_export_ms: tExportMs };
  }

  static async exportSalesRanking(range: AdminExportRange, tenantId: number, timezone = DEFAULT_TIMEZONE) {
    const { start, end, rangeLabel } = this.getRange(range, timezone);

    const tQueryStart = Date.now();
    const rows = await prisma.$queryRaw<
      {
        product_id: number;
        product_code: string;
        product_name: string;
        category: string | null;
        qty_sold: any;
        revenue: any;
        last_sold_at: Date | null;
      }[]
    >`
      SELECT
        p.product_id,
        p.product_code,
        p.product_name,
        p.category,
        COALESCE(SUM(oi.quantity), 0) AS qty_sold,
        COALESCE(SUM(oi.subtotal), 0) AS revenue,
        MAX(o.order_date) AS last_sold_at
      FROM products p
      INNER JOIN users u ON u.user_id = p.created_by_user_id
      LEFT JOIN order_items oi ON oi.product_id = p.product_id
      LEFT JOIN orders o ON o.order_id = oi.order_id
        ${start && end ? Prisma.sql`AND o.order_date >= ${start} AND o.order_date <= ${end}` : Prisma.empty}
      WHERE p.status = 'active' AND u.tenant_id = ${tenantId}
      GROUP BY p.product_id
      ORDER BY qty_sold DESC, revenue DESC
    `;
    const tQueryMs = Date.now() - tQueryStart;

    const items = rows.map((row) => ({
      ...row,
      qty_sold: Number(row.qty_sold || 0),
      revenue: Number(row.revenue || 0),
    }));

    const nonZero = items.filter((i) => i.qty_sold > 0);
    const n = nonZero.length;

    const data = items.map((row, index) => {
      let status = 'ZERO';
      if (row.qty_sold > 0) {
        const rankIndex = nonZero.findIndex((i) => i.product_id == row.product_id);
        if (rankIndex <= Math.floor(n * 0.2) - 1) status = 'HOT';
        else if (rankIndex >= Math.ceil(n * 0.8)) status = 'SLOW';
        else status = 'NORMAL';
      }

      return {
        Rank: index + 1,
        'Product Code': row.product_code,
        'Product Name': row.product_name,
        Category: row.category ?? '-',
        'Qty Sold': row.qty_sold,
        Revenue: row.revenue,
        'Last Sold At': row.last_sold_at ? formatDate(row.last_sold_at) : '-',
        Status: status,
      };
    });

    const tExportStart = Date.now();
    const fileName = `sales_ranking_${rangeLabel}_${Date.now()}`;
    const finalFileName = await ReportExportService.exportXLSX({ 'Sales Ranking': data }, fileName);
    const tExportMs = Date.now() - tExportStart;

    return { fileName: finalFileName, t_query_ms: tQueryMs, t_export_ms: tExportMs };
  }

  static getDateKey(range: AdminExportRange | undefined, timezone: string) {
    if (!range || range === 'all') return 'all';
    const now = this.getNowInTimezone(timezone);
    const date = formatDate(now);
    if (range === 'today') return date;
    if (range === 'month') return date.slice(0, 7);
    if (range === 'week') {
      const start = startOfWeek(now, { weekStartsOn: 1 });
      return formatDate(start);
    }
    return date;
  }

  static getRange(range: AdminExportRange, timezone: string) {
    const now = this.getNowInTimezone(timezone);
    if (range == 'today') {
      return { start: startOfDay(now), end: now, rangeLabel: 'today' };
    }
    if (range == 'week') {
      return { start: startOfWeek(now, { weekStartsOn: 1 }), end: now, rangeLabel: 'week' };
    }
    if (range == 'month') {
      return { start: startOfMonth(now), end: now, rangeLabel: 'month' };
    }
    return { start: undefined, end: undefined, rangeLabel: 'all' };
  }

  static getNowInTimezone(timeZone: string) {
    return new Date(new Date().toLocaleString('en-US', { timeZone }));
  }
}
