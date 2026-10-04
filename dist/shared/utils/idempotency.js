"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateIdempotencyKey = generateIdempotencyKey;
exports.validateIdempotencyKey = validateIdempotencyKey;
exports.createOrderIdempotencyKey = createOrderIdempotencyKey;
exports.isIdempotentRequest = isIdempotentRequest;
const crypto_1 = require("crypto");
const validators_1 = require("./validators");
/**
 * Generate idempotency key (UUID)
 */
function generateIdempotencyKey() {
    return (0, crypto_1.randomUUID)();
}
/**
 * Validate idempotency key format
 */
function validateIdempotencyKey(key) {
    return (0, validators_1.isValidUUID)(key);
}
/**
 * Create idempotency key from order data
 */
function createOrderIdempotencyKey(orderData) {
    // Generate UUID for order
    return generateIdempotencyKey();
}
/**
 * Check if request is idempotent (same key)
 */
function isIdempotentRequest(storedKey, incomingKey) {
    return storedKey === incomingKey;
}
//# sourceMappingURL=idempotency.js.map