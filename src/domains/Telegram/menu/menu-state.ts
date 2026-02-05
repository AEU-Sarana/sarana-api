import type { MenuId } from './menu-registry';

interface MenuState {
  stack: MenuId[];
  updatedAt: number;
}

const MENU_STATE_TTL_MS = 1000 * 60 * 60 * 4; 
const menuStates = new Map<string, MenuState>();

export const getMenuStateKey = (chatId: number | string, telegramUserId: number) =>
  `${chatId}:${telegramUserId}`;

const now = () => Date.now();

const cleanupIfExpired = (key: string, state?: MenuState) => {
  if (!state) return;
  if (now() - state.updatedAt > MENU_STATE_TTL_MS) {
    menuStates.delete(key);
  }
};

const getState = (key: string): MenuState => {
  const existing = menuStates.get(key);
  cleanupIfExpired(key, existing);
  const refreshed = menuStates.get(key);
  if (refreshed) {
    refreshed.updatedAt = now();
    return refreshed;
  }
  const state = { stack: [], updatedAt: now() };
  menuStates.set(key, state);
  return state;
};

const saveState = (key: string, state: MenuState) => {
  state.updatedAt = now();
  menuStates.set(key, state);
};

export const getStack = (key: string): MenuId[] => {
  const state = getState(key);
  return [...state.stack];
};

export const resetStack = (key: string, root: MenuId = 'main') => {
  const state = getState(key);
  state.stack = [root];
  saveState(key, state);
};

export const pushMenu = (key: string, menuId: MenuId) => {
  const state = getState(key);
  if (state.stack.length === 0) {
    state.stack.push('main');
  }
  const last = state.stack[state.stack.length - 1];
  if (last !== menuId) {
    state.stack.push(menuId);
  }
  saveState(key, state);
};

export const popMenu = (key: string): MenuId | null => {
  const state = getState(key);
  if (state.stack.length === 0) return null;
  state.stack.pop();
  saveState(key, state);
  return state.stack[state.stack.length - 1] ?? null;
};

export const goHome = (key: string) => {
  resetStack(key, 'main');
  return 'main' as const;
};

export const peekMenu = (key: string): MenuId | null => {
  const state = getState(key);
  return state.stack[state.stack.length - 1] ?? null;
};
