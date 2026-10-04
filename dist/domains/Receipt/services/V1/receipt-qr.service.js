"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.canonicalizePayload = canonicalizePayload;
exports.computeReceiptSignature = computeReceiptSignature;
exports.verifyReceiptSignature = verifyReceiptSignature;
exports.decodeQrPayload = decodeQrPayload;
exports.isHighEntropyCode = isHighEntropyCode;
const crypto_1 = __importDefault(require("crypto"));
const env_1 = require("../../../../shared/config/env");
const security_utils_1 = require("../../../../shared/utils/security.utils");
function sortKeys(value) {
    if (Array.isArray(value)) {
        return value.map(sortKeys);
    }
    if (value && typeof value === 'object') {
        const sorted = {};
        for (const key of Object.keys(value).sort()) {
            sorted[key] = sortKeys(value[key]);
        }
        return sorted;
    }
    return value;
}
function canonicalizePayload(payload) {
    return JSON.stringify(sortKeys(payload));
}
function computeReceiptSignature(payload) {
    if (!env_1.env.RECEIPT_QR_HMAC_SECRET) {
        throw new Error('Missing RECEIPT_QR_HMAC_SECRET');
    }
    const data = canonicalizePayload(payload);
    return crypto_1.default.createHmac('sha256', env_1.env.RECEIPT_QR_HMAC_SECRET).update(data).digest('hex');
}
function verifyReceiptSignature(payload, signature) {
    const expected = computeReceiptSignature(payload);
    return (0, security_utils_1.safeCompare)(expected, signature);
}
function decodeQrPayload(qr) {
    const [encoded, signature] = qr.split('.');
    if (!encoded || !signature) {
        throw new Error('Invalid qr format');
    }
    const json = Buffer.from(encoded, 'base64url').toString('utf-8');
    const payload = JSON.parse(json);
    return { payload, signature };
}
function isHighEntropyCode(code) {
    if (!code || /^RCP-/i.test(code))
        return false;
    return /^[A-Za-z0-9_-]{20,}$/.test(code);
}
//# sourceMappingURL=receipt-qr.service.js.map