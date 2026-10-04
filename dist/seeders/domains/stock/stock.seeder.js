"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.StockSeeder = void 0;
const base_seeder_1 = require("../../base-seeder");
const client_1 = __importDefault(require("../../../database/client"));
const seeder_helper_1 = require("../utils/seeder-helper");
class StockSeeder extends base_seeder_1.BaseSeeder {
    constructor() {
        super(...arguments);
        this.name = 'Stock';
    }
    async seed() {
        const productIds = await seeder_helper_1.SeederHelper.getProductIds();
        if (productIds.length === 0) {
            console.log('   ⚠️  No products found. Skipping stock seeding.');
            return;
        }
        const totals = await client_1.default.stockLot.groupBy({
            by: ['productId'],
            _sum: { qtyOnHand: true },
        });
        const totalMap = new Map(totals.map((row) => [row.productId, Number(row._sum.qtyOnHand || 0)]));
        for (const productId of productIds) {
            const quantity = totalMap.get(productId) ?? 0;
            await client_1.default.stock.upsert({
                where: { productId },
                update: {
                    quantity,
                    stockVersion: { increment: 1 },
                    updatedAt: new Date(),
                },
                create: {
                    productId,
                    quantity,
                    stockVersion: 1,
                    updatedAt: new Date(),
                },
            });
        }
        console.log(`Synced stock totals for ${productIds.length} products`);
    }
}
exports.StockSeeder = StockSeeder;
//# sourceMappingURL=stock.seeder.js.map