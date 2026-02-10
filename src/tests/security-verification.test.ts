import { test } from 'node:test';
import assert from 'node:assert';
import { maskSecret, safeCompare } from '../shared/utils/security.utils';

test('Security Utils - safeCompare', () => {
    assert.strictEqual(safeCompare('secret', 'secret'), true);
    assert.strictEqual(safeCompare('secret', 'wrong'), false);
    assert.strictEqual(safeCompare('secret', 'secretlonger'), false);
});

test('Security Utils - maskSecret', () => {
    assert.strictEqual(maskSecret('LINK_1234567890'), 'LINK_1234***');
    assert.strictEqual(maskSecret('ADM-123456'), 'ADM-1234***');
    assert.strictEqual(maskSecret('RCP-2024-001'), 'RCP-2024-001***');
    assert.strictEqual(maskSecret('12345678'), '1234***');
    assert.strictEqual(maskSecret(null), '***');
});

// Since we cannot easily run full integration tests without a DB here,
// we'll at least verify the logic units.
