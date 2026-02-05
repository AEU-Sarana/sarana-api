import { MENU_DEFS, NAV_ROW, type MenuId, type MenuButton } from './menu-registry';
import { TelegramService } from '@src/domains/Telegram/services/telegram.service';
import { logger } from '@src/shared/utils/logger';

export interface MenuContext {
  chatId: number | string;
  telegramUserId: number;
  messageId?: number;
  fromCallback?: boolean;
}

interface RenderMenuOptions {
  preferEdit?: boolean;
}

const buildKeyboard = (menuId: MenuId): MenuButton[][] => {
  const def = MENU_DEFS[menuId];
  if (!def) return [];
  const rows = def.buildButtons();
  const shouldShowNav = def.showNav ?? menuId !== 'main';
  if (!shouldShowNav) return rows;
  return [...rows, NAV_ROW];
};

export const renderMenu = async (
  ctx: MenuContext,
  menuId: MenuId,
  options?: RenderMenuOptions
): Promise<void> => {
  const def = MENU_DEFS[menuId];
  if (!def) {
    logger.warn('Menu definition not found', { menuId });
    return;
  }

  const keyboard = buildKeyboard(menuId);
  const replyMarkup = { inline_keyboard: keyboard };
  const preferEdit = options?.preferEdit ?? true;

  if (preferEdit && ctx.fromCallback && ctx.messageId) {
    try {
      await TelegramService.editMenuMessage(
        ctx.chatId,
        ctx.messageId,
        def.title,
        replyMarkup
      );
      return;
    } catch (error: any) {
      logger.warn('Failed to edit menu message, falling back to send', {
        menuId,
        error: error.message,
      });
    }
  }

  try {
    await TelegramService.sendMenuMessage(ctx.chatId, def.title, replyMarkup);
  } catch (error: any) {
    logger.error('Failed to send menu message', {
      menuId,
      error: error.message,
    });
  }
};
