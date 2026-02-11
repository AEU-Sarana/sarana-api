import crypto from 'crypto';
import { env } from '@src/shared/config/env';
import { safeCompare } from '@src/shared/utils/security.utils';
import type { ReceiptQrPayload } from '@src/domains/Receipt/types/receipt-qr.types';

function sortKeys(value: any): any {
  if (Array.isArray(value)) {
    return value.map(sortKeys);
  }
  if (value && typeof value === 'object') {
    const sorted: Record<string, any> = {};
    for (const key of Object.keys(value).sort()) {
      sorted[key] = sortKeys(value[key]);
    }
    return sorted;
  }
  return value;
}

export function canonicalizePayload(payload: ReceiptQrPayload): string {
  return JSON.stringify(sortKeys(payload));
}

export function computeReceiptSignature(payload: ReceiptQrPayload): string {
  if (!env.RECEIPT_QR_HMAC_SECRET) {
    throw new Error('Missing RECEIPT_QR_HMAC_SECRET');
  }
  const data = canonicalizePayload(payload);
  return crypto.createHmac('sha256', env.RECEIPT_QR_HMAC_SECRET).update(data).digest('hex');
}

export function verifyReceiptSignature(payload: ReceiptQrPayload, signature: string): boolean {
  const expected = computeReceiptSignature(payload);
  return safeCompare(expected, signature);
}

export function decodeQrPayload(qr: string): { payload: ReceiptQrPayload; signature: string } {
  const [encoded, signature] = qr.split('.');
  if (!encoded || !signature) {
    throw new Error('Invalid qr format');
  }
  const json = Buffer.from(encoded, 'base64url').toString('utf-8');
  const payload = JSON.parse(json) as ReceiptQrPayload;
  return { payload, signature };
}

export function isHighEntropyCode(code: string): boolean {
  if (!code || /^RCP-/i.test(code)) return false;
  return /^[A-Za-z0-9_-]{20,}$/.test(code);
}
