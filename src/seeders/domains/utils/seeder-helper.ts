import prisma from '../../../database/client';

export class SeederHelper {
  /**
   * Get a random user ID from the database
   */
  static async getRandomUserId(): Promise<number> {
    const users = await prisma.user.findMany({
      select: { userId: true },
      take: 1,
    });
    if (users.length === 0) {
      throw new Error('No users found in database. Please seed users first.');
    }
    return users[0].userId;
  }

  /**
   * Get a random admin user ID
   */
  static async getAdminUserId(): Promise<number> {
    const admin = await prisma.user.findFirst({
      where: { role: 'ADMIN' },
      select: { userId: true },
    });
    if (!admin) {
      throw new Error('No admin user found. Please seed users first.');
    }
    return admin.userId;
  }

  /**
   * Get a random cashier user ID
   */
  static async getSellerUserId(): Promise<number> {
    const seller = await prisma.user.findFirst({
      where: { role: 'CASHIER' },
      select: { userId: true },
    });
    if (!seller) {
      throw new Error('No cashier user found. Please seed users first.');
    }
    return seller.userId;
  }

  /**
   * Get all product IDs
   */
  static async getProductIds(): Promise<number[]> {
    const products = await prisma.product.findMany({
      select: { productId: true },
    });
    return products.map((p: { productId: number }) => p.productId);
  }

  /**
   * Get all order IDs
   */
  static async getOrderIds(): Promise<number[]> {
    const orders = await prisma.order.findMany({
      select: { orderId: true },
    });
    return orders.map((o: { orderId: number }) => o.orderId);
  }

  /**
   * Get all shift IDs
   */
  static async getShiftIds(): Promise<number[]> {
    const shifts = await prisma.shift.findMany({
      select: { shiftId: true },
    });
    return shifts.map((s: { shiftId: number }) => s.shiftId);
  }

  /**
   * Generate a random number between min and max (inclusive)
   */
  static randomInt(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  /**
   * Generate a random float between min and max
   */
  static randomFloat(min: number, max: number, decimals: number = 2): number {
    const value = Math.random() * (max - min) + min;
    return parseFloat(value.toFixed(decimals));
  }

  /**
   * Pick a random element from an array
   */
  static randomElement<T>(array: T[]): T {
    return array[Math.floor(Math.random() * array.length)];
  }

  /**
   * Generate a random date between start and end
   */
  static randomDate(start: Date, end: Date): Date {
    return new Date(
      start.getTime() + Math.random() * (end.getTime() - start.getTime())
    );
  }
}

