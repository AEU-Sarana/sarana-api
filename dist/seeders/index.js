"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = __importDefault(require("../database/client"));
const user_seeder_1 = require("./domains/auth/user.seeder");
const product_seeder_1 = require("./domains/product/product.seeder");
const stock_seeder_1 = require("./domains/stock/stock.seeder");
const stock_lot_seeder_1 = require("./domains/stock/stock-lot.seeder");
const order_seeder_1 = require("./domains/order/order.seeder");
const order_item_seeder_1 = require("./domains/order/order-item.seeder");
const stock_movement_seeder_1 = require("./domains/stock/stock-movement.seeder");
const app_settings_seeder_1 = require("./domains/settings/app-settings.seeder");
const audit_log_seeder_1 = require("./domains/shared/audit-log.seeder");
const customer_seeder_1 = require("./domains/customer/customer.seeder");
const supplier_seeder_1 = require("./domains/purchasing/supplier.seeder");
const po_seeder_1 = require("./domains/purchasing/po.seeder");
/**
 * Main seeder function
 * Runs all seeders in the correct order based on dependencies
 */
async function main() {
    console.log('🌱Starting database seeding...\n');
    const seeders = [
        // 1. Base data (no dependencies)
        new user_seeder_1.UserSeeder(),
    ];
    if (process.env.SEED_USERS_ONLY !== 'true') {
        seeders.push(
        // 2. Products (depends on users)
        new product_seeder_1.ProductSeeder(), 
        // 3. Customers & Suppliers (needed before orders & POs)
        new customer_seeder_1.CustomerSeeder(), new supplier_seeder_1.SupplierSeeder(), 
        // 4. Stock lots (depends on products)
        new stock_lot_seeder_1.StockLotSeeder(), 
        // 5. Orders (depends on users, products, customers)
        new order_seeder_1.OrderSeeder(), new order_item_seeder_1.OrderItemSeeder(), 
        // 6. Purchase Orders (depends on suppliers)
        new po_seeder_1.PurchaseOrderSeeder(), 
        // 7. Stock Movements (depends on products, orders, users, stock lots)
        new stock_movement_seeder_1.StockMovementSeeder(), 
        // 8. Stock totals (sync from stock lots)
        new stock_seeder_1.StockSeeder(), 
        // 9. Settings (depends on users)
        new app_settings_seeder_1.AppSettingsSeeder(), 
        // 10. Audit Logs
        new audit_log_seeder_1.AuditLogSeeder());
    }
    try {
        for (const seeder of seeders) {
            await seeder.run();
        }
        console.log('✨ Database seeding completed successfully!');
        // Print summary
        const counts = await Promise.all([
            client_1.default.user.count(),
            client_1.default.product.count(),
            client_1.default.stock.count(),
            client_1.default.stockLot.count(),
            client_1.default.order.count(),
            client_1.default.orderItem.count(),
            client_1.default.stockMovement.count(),
            client_1.default.appSetting.count(),
            client_1.default.auditLog.count(),
            client_1.default.customer.count(),
        ]);
        console.log('\n📊 Seeding Summary:');
        console.log('===================');
        console.log(`Users: ${counts[0]}`);
        console.log(`Products: ${counts[1]}`);
        console.log(`Stock Records: ${counts[2]}`);
        console.log(`Stock Lots: ${counts[3]}`);
        console.log(`Orders: ${counts[4]}`);
        console.log(`Order Items: ${counts[5]}`);
        console.log(`Stock Movements: ${counts[6]}`);
        console.log(`App Settings: ${counts[7]}`);
        console.log(`Audit Logs: ${counts[8]}`);
        console.log(`Customers: ${counts[9]}`);
    }
    catch (error) {
        console.error('❌ Seeding failed:', error);
        throw error;
    }
}
// Run seeder
main()
    .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
})
    .finally(async () => {
    await client_1.default.$disconnect();
});
//# sourceMappingURL=index.js.map