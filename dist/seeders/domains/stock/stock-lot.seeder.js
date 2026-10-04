"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.StockLotSeeder = void 0;
const base_seeder_1 = require("../../base-seeder");
const client_1 = __importDefault(require("../../../database/client"));
const seeder_helper_1 = require("../utils/seeder-helper");
const DAY_MS = 24 * 60 * 60 * 1000;
class StockLotSeeder extends base_seeder_1.BaseSeeder {
    constructor() {
        super(...arguments);
        this.name = 'Stock Lots';
    }
    async seed() {
        const products = await client_1.default.product.findMany({
            select: {
                productId: true,
                hasExpiry: true,
                avgCost: true,
                lastPurchaseCost: true,
            },
        });
        const userId = await seeder_helper_1.SeederHelper.getAdminUserId();
        if (products.length === 0) {
            console.log('⚠️ No products found. Skipping stock lot seeding.');
            return;
        }
        let lotCount = 0;
        for (const product of products) {
            const lotsForProduct = seeder_helper_1.SeederHelper.randomInt(1, 3);
            let totalQty = 0;
            for (let i = 0; i < lotsForProduct; i++) {
                const quantity = seeder_helper_1.SeederHelper.randomInt(5, 80);
                totalQty += quantity;
                const receivedAt = seeder_helper_1.SeederHelper.randomDate(new Date(Date.now() - 120 * DAY_MS), new Date());
                const expiredAt = product.hasExpiry
                    ? new Date(receivedAt.getTime() + seeder_helper_1.SeederHelper.randomInt(5, 120) * DAY_MS)
                    : null;
                const baseCost = Number(product.avgCost ?? product.lastPurchaseCost ?? 0) ||
                    seeder_helper_1.SeederHelper.randomFloat(5, 100);
                const lot = await client_1.default.stockLot.create({
                    data: {
                        productId: product.productId,
                        qtyOnHand: quantity,
                        receivedAt,
                        expiredAt,
                        cost: baseCost,
                    },
                });
                await client_1.default.stockMovement.create({
                    data: {
                        productId: product.productId,
                        lotId: lot.id,
                        movementType: 'STOCK_IN',
                        quantity,
                        cost: baseCost,
                        createdBy: userId,
                        createdAt: receivedAt,
                    },
                });
                lotCount += 1;
            }
            await client_1.default.stock.upsert({
                where: { productId: product.productId },
                update: {
                    quantity: totalQty,
                    stockVersion: { increment: 1 },
                    updatedAt: new Date(),
                },
                create: {
                    productId: product.productId,
                    quantity: totalQty,
                    stockVersion: 1,
                    updatedAt: new Date(),
                },
            });
        }
        console.log(`   Created ${lotCount} stock lots`);
    }
}
exports.StockLotSeeder = StockLotSeeder;
//# sourceMappingURL=stock-lot.seeder.js.map