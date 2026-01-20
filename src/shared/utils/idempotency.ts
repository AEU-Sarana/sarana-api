import { v4 as uuidv4 } from 'uuid';
import { isValidUUID } from './validators';

/**
 * Generate idempotency key (UUID)
 */
export function generateIdempotencyKey(): string {
  return uuidv4();
}

/**
 * Validate idempotency key format
 */
export function validateIdempotencyKey(key: string): boolean {
  return isValidUUID(key);
}

/**
 * Create idempotency key from order data
 */
export function createOrderIdempotencyKey(orderData: {
  sellerId: number;
  timestamp: Date;
  items: Array<{ productId: number; quantity: number }>;
}): string {
  // Generate UUID for order
  return generateIdempotencyKey();
}

/**
 * Check if request is idempotent (same key)
 */
export function isIdempotentRequest(
  storedKey: string,
  incomingKey: string
): boolean {
  return storedKey === incomingKey;
}