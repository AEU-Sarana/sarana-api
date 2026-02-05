import test from 'node:test';
import assert from 'node:assert/strict';
import { MENU_DEFS } from '../src/domains/Telegram/menu/menu-registry';

test('main menu uses submenu entry for inventory report', () => {
  const keyboard = MENU_DEFS.main.buildButtons();
  const labels = keyboard.flat().map((button) => button.text);

  assert.ok(labels.includes('📦 របាយការណ៍ស្តុក'));
  assert.ok(labels.includes('📊 របាយការណ៍'));
  assert.ok(!labels.includes('ស្តុកទាប'));
});

test('inventory submenu contains all options', () => {
  const keyboard = MENU_DEFS.inventory.buildButtons();
  const labels = keyboard.flat().map((button) => button.text);

  assert.ok(labels.includes('ស្តុកនៅសល់'));
  assert.ok(labels.includes('តម្លៃស្តុកសរុប'));
  assert.ok(labels.includes('ស្តុកទាប'));
  assert.ok(labels.includes('ស្តុកជិតអស់'));
});
