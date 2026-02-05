import test from 'node:test';
import assert from 'node:assert/strict';
import {
  getMenuStateKey,
  resetStack,
  pushMenu,
  popMenu,
  getStack,
  goHome,
} from '../src/domains/Telegram/menu/menu-state';
import { renderMenu } from '../src/domains/Telegram/menu/menu-renderer';
import { TelegramService } from '../src/domains/Telegram/services/telegram.service';

test('opening submenu pushes stack', () => {
  const key = getMenuStateKey(100, 1);
  resetStack(key);
  pushMenu(key, 'report');

  assert.deepEqual(getStack(key), ['main', 'report']);
});

test('back returns previous menu', () => {
  const key = getMenuStateKey(200, 2);
  resetStack(key);
  pushMenu(key, 'inventory');

  const previous = popMenu(key);
  assert.equal(previous, 'main');
});

test('home returns main menu', () => {
  const key = getMenuStateKey(300, 3);
  resetStack(key);
  pushMenu(key, 'income');

  const home = goHome(key);
  assert.equal(home, 'main');
  assert.deepEqual(getStack(key), ['main']);
});

test('fallback to SendMessage when edit fails', async () => {
  const originalEdit = TelegramService.editMenuMessage;
  const originalSend = TelegramService.sendMenuMessage;
  let sendCalled = false;

  TelegramService.editMenuMessage = (async () => {
    throw new Error('edit failed');
  }) as any;

  TelegramService.sendMenuMessage = (async () => {
    sendCalled = true;
    return { success: true, messageId: 1, sentAt: new Date() } as any;
  }) as any;

  await renderMenu(
    { chatId: 1, telegramUserId: 1, messageId: 10, fromCallback: true },
    'inventory',
    { preferEdit: true }
  );

  assert.ok(sendCalled);

  TelegramService.editMenuMessage = originalEdit;
  TelegramService.sendMenuMessage = originalSend;
});
