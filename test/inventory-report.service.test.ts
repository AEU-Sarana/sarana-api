import test from 'node:test';
import assert from 'node:assert/strict';
import { Prisma } from '@prisma/client';
import prisma from '../src/database/client';
import { InventoryReportService } from '../src/domains/Stock/services/inventory-report.service';

async function withQueryRawMock<T>(queue: unknown[], fn: () => Promise<T>): Promise<T> {
  const original = prisma.$queryRaw;
  let call = 0;
  prisma.$queryRaw = (async () => queue[call++]) as any;
  try {
    return await fn();
  } finally {
    prisma.$queryRaw = original;
  }
}

test('stock on hand summary uses query totals', async () => {
  const report = await withQueryRawMock(
    [
      [{ total_skus: 2, total_qty: 15 }],
      [
        { product_id: 1, product_name: 'Item A', product_code: 'A1', quantity: 10 },
        { product_id: 2, product_name: 'Item B', product_code: 'B1', quantity: 5 },
      ],
    ],
    () => InventoryReportService.getStockOnHand(10)
  );

  assert.equal(report.summary.total_skus, 2);
  assert.equal(report.summary.total_qty, 15);
  assert.equal(report.items.length, 2);
});

test('inventory value uses cost basis for totals', async () => {
  const report = await withQueryRawMock(
    [
      [{ total_skus: 1, total_qty: 3, total_value: new Prisma.Decimal(70) }],
      [
        {
          product_id: 1,
          product_name: 'Item A',
          product_code: 'A1',
          quantity: 3,
          avg_cost: new Prisma.Decimal(20),
          last_purchase_cost: null,
          total_value: new Prisma.Decimal(60),
        },
      ],
      [{ missing_count: 0 }],
    ],
    () => InventoryReportService.getInventoryValue(10)
  );

  assert.equal(report.summary.total_value.toNumber(), 70);
  assert.equal(report.items[0].total_value.toNumber(), 60);
});

test('reorder alerts return items with thresholds', async () => {
  const report = await withQueryRawMock(
    [
      [
        {
          product_id: 1,
          product_name: 'Item A',
          product_code: 'A1',
          quantity: 2,
          reorder_point: 3,
        },
      ],
    ],
    () => InventoryReportService.getReorderAlerts(10)
  );

  assert.equal(report.items.length, 1);
  assert.equal(report.items[0].reorder_point, 3);
});
