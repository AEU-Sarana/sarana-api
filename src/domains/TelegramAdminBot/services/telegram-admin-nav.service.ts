import { renderMenu } from '@src/domains/Telegram/menu/menu-renderer';
import {
  getMenuStateKey,
  goHome,
  popMenu,
  pushMenu,
  resetStack,
} from '@src/domains/Telegram/menu/menu-state';
import { type MenuId } from '@src/domains/Telegram/menu/menu-registry';

type NavContext = {
  chatId: number;
  telegramUserId: number;
  tenantId: number;
  messageId?: number;
  fromCallback?: boolean;
};

export class TelegramAdminNavService {
  static async handleNavigation(data: string, ctx: NavContext) {
    const menuKey = getMenuStateKey(ctx.chatId, ctx.telegramUserId);

    if (data.startsWith('nav:')) {
      const parts = data.split(':');
      const navType = parts[1];
      const navTarget = parts[2] as MenuId | undefined;

      if (navType === 'home') {
        goHome(menuKey);
        return renderMenu({ ...ctx, fromCallback: true }, 'main');
      }

      if (navType === 'back') {
        const previous = popMenu(menuKey);
        const target = previous ?? goHome(menuKey);
        return renderMenu({ ...ctx, fromCallback: true }, target);
      }

      if (navType === 'open' && navTarget) {
        if (navTarget === 'main') {
          resetStack(menuKey);
        } else {
          pushMenu(menuKey, navTarget);
        }
        return renderMenu({ ...ctx, fromCallback: true }, navTarget);
      }
    }

    if (data === 'MENU:MAIN' || data === 'nav_home') {
      goHome(menuKey);
      return renderMenu({ ...ctx, fromCallback: true }, 'main');
    }

    if (data === 'nav_back') {
      const previous = popMenu(menuKey);
      const target = previous ?? goHome(menuKey);
      return renderMenu({ ...ctx, fromCallback: true }, target);
    }

    if (data === 'inv_menu') {
      pushMenu(menuKey, 'inventory');
      return renderMenu({ ...ctx, fromCallback: true }, 'inventory');
    }

    if (data.startsWith('TOP_PRODUCTS:')) {
      const range = data.replace('TOP_PRODUCTS:', '');
      if (range === 'MENU') {
        pushMenu(menuKey, 'top_products');
        return renderMenu({ ...ctx, fromCallback: true }, 'top_products');
      }
    }

    if (data.startsWith('SLOW_PRODUCTS:')) {
      const range = data.replace('SLOW_PRODUCTS:', '');
      if (range === 'MENU') {
        pushMenu(menuKey, 'slow_products');
        return renderMenu({ ...ctx, fromCallback: true }, 'slow_products');
      }
    }

    if (data.startsWith('INCOME:')) {
      const range = data.replace('INCOME:', '');
      if (range === 'MENU') {
        pushMenu(menuKey, 'income');
        return renderMenu({ ...ctx, fromCallback: true }, 'income');
      }
    }

    return null;
  }
}
