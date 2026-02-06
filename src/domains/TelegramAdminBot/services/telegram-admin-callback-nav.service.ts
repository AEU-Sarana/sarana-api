import { MENU_DEFS, NAV_ROW, NAV_EXPORT_EXCEL, NAV_EXPORT_SALES_RANK, NAV_MAIN, NAV_STOCK_HISTORY, NAV_UPDATE_STOCK, NAV_UPDATE_STOCK_ADMIN, type MenuId, type MenuButton } from '@src/domains/Telegram/menu/menu-registry';
import {
  getMenuStateKey,
  goHome,
  popMenu,
  pushMenu,
  resetStack,
} from '@src/domains/Telegram/menu/menu-state';
import type { TelegramAdminCallbackResult } from '@src/domains/TelegramAdminBot/types/telegram-admin-callback.types';
import { TelegramAdminStockService } from './telegram-admin-stock.service';

type CallbackContext = {
  chatId: number;
  telegramUserId: number;
};

const buildKeyboard = (menuId: MenuId): MenuButton[][] => {
  const def = MENU_DEFS[menuId];
  if (!def) return [];
  const rows = def.buildButtons();
  const shouldShowNav = def.showNav ?? menuId !== 'main';
  if (!shouldShowNav) return rows;
  return [...rows, NAV_ROW];
};

export class TelegramAdminCallbackNavService {
  static async handle(
    callbackData: string,
    ctx: CallbackContext
  ): Promise<TelegramAdminCallbackResult | null> {
    const menuKey = getMenuStateKey(ctx.chatId, ctx.telegramUserId);

    if (callbackData.startsWith('nav:')) {
      const parts = callbackData.split(':');
      const navType = parts[1];
      const navTarget = parts[2] as MenuId | undefined;

      if (navType === 'home') {
        goHome(menuKey);
        return this.buildMenuResult('main');
      }

      if (navType === 'back') {
        const previous = popMenu(menuKey);
        const target = previous ?? goHome(menuKey);
        return this.buildMenuResult(target);
      }

      if (navType === 'open' && navTarget) {
        if (navTarget === 'main') {
          resetStack(menuKey);
        } else {
          pushMenu(menuKey, navTarget);
        }
        return this.buildMenuResult(navTarget);
      }
    }


    if (callbackData === NAV_MAIN) {
      goHome(menuKey);
      return this.buildMenuResult('main');
    }

    if (callbackData === NAV_EXPORT_EXCEL) {
      pushMenu(menuKey, 'export_excel');
      return this.buildMenuResult('export_excel');
    }

    if (callbackData === NAV_EXPORT_SALES_RANK) {
      pushMenu(menuKey, 'export_sales_rank');
      return this.buildMenuResult('export_sales_rank');
    }
    if (callbackData === NAV_STOCK_HISTORY) {
      return TelegramAdminStockService.startStockHistoryPrompt(ctx.chatId, ctx.telegramUserId);
    }
    if (callbackData === NAV_UPDATE_STOCK) {
      goHome(menuKey);
      return this.buildMenuResult('main');
    }
    if (callbackData === NAV_UPDATE_STOCK_ADMIN) {
      pushMenu(menuKey, 'update_stock');
      return this.buildMenuResult('update_stock');
    }
    if (callbackData === 'MENU:MAIN' || callbackData === 'nav_home') {
      goHome(menuKey);
      return this.buildMenuResult('main');
    }

    if (callbackData === 'nav_back') {
      const previous = popMenu(menuKey);
      const target = previous ?? goHome(menuKey);
      return this.buildMenuResult(target);
    }

    if (callbackData === 'inv_menu') {
      pushMenu(menuKey, 'inventory');
      return this.buildMenuResult('inventory');
    }

    if (callbackData.startsWith('TOP_PRODUCTS:')) {
      const range = callbackData.replace('TOP_PRODUCTS:', '');
      if (range === 'MENU') {
        pushMenu(menuKey, 'top_products');
        return this.buildMenuResult('top_products');
      }
    }

    if (callbackData.startsWith('SLOW_PRODUCTS:')) {
      const range = callbackData.replace('SLOW_PRODUCTS:', '');
      if (range === 'MENU') {
        pushMenu(menuKey, 'slow_products');
        return this.buildMenuResult('slow_products');
      }
    }

    if (callbackData.startsWith('INCOME:')) {
      const range = callbackData.replace('INCOME:', '');
      if (range === 'MENU') {
        pushMenu(menuKey, 'income');
        return this.buildMenuResult('income');
      }
    }

    return null;
  }

  private static buildMenuResult(menuId: MenuId): TelegramAdminCallbackResult {
    const def = MENU_DEFS[menuId];
    const keyboard = buildKeyboard(menuId);
    return {
      text: def?.title || 'Menu',
      replyMarkup: { inline_keyboard: keyboard },
      parseMode: 'Markdown',
    };
  }
}
