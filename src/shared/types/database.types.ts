import { Prisma } from '@src/database/generated/client';

/**
 * Prisma transaction type
 */
export type PrismaTransaction = Omit<
  Prisma.TransactionClient,
  '$connect' | '$disconnect' | '$on' | '$transaction' | '$use'
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
  isolationLevel?: Prisma.TransactionIsolationLevel;
}