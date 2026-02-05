type PrismaClientType = typeof import('@src/database/client').default;

/**
 * Prisma transaction type
 */
export type PrismaTransaction = Omit<
  PrismaClientType,
  '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'
>;

/**
 * Database operation result
 */
export interface DatabaseResult<T> {
  data: T | null;
  error?: Error;
}

/**
 * Transaction options
 */
export interface TransactionOptions {
  timeout?: number;
  isolationLevel?: import('@prisma/client').Prisma.TransactionIsolationLevel;
}
