import test from 'node:test';
import assert from 'node:assert/strict';
import { TelegramService } from '../src/domains/Telegram/services/telegram.service';

test('admin menu removes low stock and adds inventory report', () => {
  const keyboard = TelegramService.buildAdminMenuKeyboard();
  const labels = keyboard.inline_keyboard.flat().map((button) => button.text);

  assert.ok(labels.includes('📦 របាយការណ៍ស្តុក'));
  assert.ok(!labels.includes('ស្តុកទាប'));
});

test('inventory submenu contains all options', () => {
  const keyboard = TelegramService.buildInventoryMenuKeyboard();
  const labels = keyboard.inline_keyboard.flat().map((button) => button.text);

  assert.ok(labels.includes('ស្តុកនៅសល់'));
  assert.ok(labels.includes('តម្លៃស្តុកសរុប'));
  assert.ok(labels.includes('ស្តុកទាប'));
  assert.ok(labels.includes('ស្តុកជិតអស់'));
});
