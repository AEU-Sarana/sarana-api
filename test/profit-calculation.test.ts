import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateProfit } from '../src/domains/Report/utils/income-math';

test('profit uses COGS (not purchases)', () => {
  const totalSales = 100;
  const purchases = 500;
  const cogs = 70;

  const profit = calculateProfit(totalSales, cogs);

  assert.equal(profit, 30);
  assert.notEqual(profit, totalSales - purchases);
});
