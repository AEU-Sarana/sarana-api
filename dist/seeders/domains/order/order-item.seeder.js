"use strict";
// Order items are created automatically when orders are created
// This seeder is kept for consistency but can be used for additional order items if needed
Object.defineProperty(exports, "__esModule", { value: true });
exports.OrderItemSeeder = void 0;
const base_seeder_1 = require("../../base-seeder");
class OrderItemSeeder extends base_seeder_1.BaseSeeder {
    constructor() {
        super(...arguments);
        this.name = 'Order Items';
    }
    async seed() {
        // Order items are created as part of OrderSeeder
        // This seeder can be used to add additional order items if needed
        console.log('   Order items are created automatically with orders');
    }
}
exports.OrderItemSeeder = OrderItemSeeder;
//# sourceMappingURL=order-item.seeder.js.map