"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SeederHelper = void 0;
const client_1 = __importDefault(require("../../../database/client"));
class SeederHelper {
    /**
     * Get a random user ID from the database
     */
    static async getRandomUserId() {
        const users = await client_1.default.user.findMany({
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
    static async getAdminUserId() {
        const admin = await client_1.default.user.findFirst({
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
    static async getSellerUserId() {
        const seller = await client_1.default.user.findFirst({
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
    static async getProductIds() {
        const products = await client_1.default.product.findMany({
            select: { productId: true },
        });
        return products.map((p) => p.productId);
    }
    /**
     * Get all order IDs
     */
    static async getOrderIds() {
        const orders = await client_1.default.order.findMany({
            select: { orderId: true },
        });
        return orders.map((o) => o.orderId);
    }
    /**
     * Get all shift IDs
     */
    static async getShiftIds() {
        return [];
    }
    /**
     * Generate a random number between min and max (inclusive)
     */
    static randomInt(min, max) {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }
    /**
     * Generate a random float between min and max
     */
    static randomFloat(min, max, decimals = 2) {
        const value = Math.random() * (max - min) + min;
        return parseFloat(value.toFixed(decimals));
    }
    /**
     * Pick a random element from an array
     */
    static randomElement(array) {
        return array[Math.floor(Math.random() * array.length)];
    }
    /**
     * Generate a random date between start and end
     */
    static randomDate(start, end) {
        return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
    }
}
exports.SeederHelper = SeederHelper;
//# sourceMappingURL=seeder-helper.js.map