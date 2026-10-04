"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.OrderSeeder = void 0;
const base_seeder_1 = require("../../base-seeder");
const client_1 = __importDefault(require("../../../database/client"));
const seeder_helper_1 = require("../utils/seeder-helper");
const data_generator_1 = require("../utils/data-generator");
class OrderSeeder extends base_seeder_1.BaseSeeder {
    constructor() {
        super(...arguments);
        this.name = 'Orders';
    }
    async seed() {
        const sellers = await client_1.default.user.findMany({
            where: { role: { in: ['ADMIN', 'CASHIER'] } },
            select: { userId: true },
        });
        if (sellers.length === 0) {
            console.log('   ⚠️  No sellers found. Skipping order seeding.');
            return;
        }
        const productIds = await seeder_helper_1.SeederHelper.getProductIds();
        if (productIds.length === 0) {
            console.log('   ⚠️  No products found. Skipping order seeding.');
            return;
        }
        const customers = await client_1.default.customer.findMany({ take: 5 });
        const orders = [];
        let orderIndex = 0;
        for (const seller of sellers) {
            // Create 5-15 orders per seller
            const orderCount = seeder_helper_1.SeederHelper.randomInt(5, 15);
            for (let i = 0; i < orderCount; i++) {
                const orderDate = new Date();
                if (i >= 3) {
                    orderDate.setDate(orderDate.getDate() - seeder_helper_1.SeederHelper.randomInt(1, 30));
                }
                // Create order items (1-5 items per order)
                const itemCount = seeder_helper_1.SeederHelper.randomInt(1, 5);
                const orderItems = [];
                let totalAmount = 0;
                for (let j = 0; j < itemCount; j++) {
                    const productId = seeder_helper_1.SeederHelper.randomElement(productIds);
                    const product = await client_1.default.product.findUnique({
                        where: { productId },
                        select: { productName: true, price: true, lastPurchaseCost: true },
                    });
                    if (!product)
                        continue;
                    const quantity = seeder_helper_1.SeederHelper.randomInt(1, 5);
                    const unitPrice = Number(product.price);
                    const costPerUnitAtSale = Number(product.lastPurchaseCost ?? 0);
                    const discountAmount = seeder_helper_1.SeederHelper.randomFloat(0, unitPrice * 0.1);
                    const subtotal = (unitPrice * quantity) - discountAmount;
                    orderItems.push({
                        productId,
                        productName: product.productName,
                        quantity,
                        unitPrice,
                        costPerUnitAtSale,
                        cogsLineTotal: costPerUnitAtSale * quantity,
                        discountAmount,
                        subtotal,
                    });
                    totalAmount += subtotal;
                }
                if (orderItems.length === 0)
                    continue;
                const discountAmount = seeder_helper_1.SeederHelper.randomFloat(0, totalAmount * 0.05);
                const taxAmount = (totalAmount - discountAmount) * 0.1;
                const serviceFee = seeder_helper_1.SeederHelper.randomFloat(0, 10);
                const finalTotal = Number((totalAmount - discountAmount + taxAmount + serviceFee).toFixed(2));
                // Randomly attach customer and debt status
                const customer = customers.length > 0 && i % 3 === 0 ? customers[i % customers.length] : null;
                const isDebt = customer && i % 6 === 0;
                const isPartial = customer && !isDebt && i % 5 === 0;
                const paidAmount = isDebt ? 0 : isPartial ? Number((finalTotal * 0.3).toFixed(2)) : finalTotal;
                const balanceDue = Math.max(0, Number((finalTotal - paidAmount).toFixed(2)));
                const paymentStatus = balanceDue <= 0 ? 'PAID' : paidAmount > 0 ? 'PARTIAL' : 'UNPAID';
                const dueDate = balanceDue > 0 ? new Date(orderDate.getTime() + 30 * 24 * 3600 * 1000) : null;
                const order = await client_1.default.order.create({
                    data: {
                        receiptNumber: data_generator_1.DataGenerator.generateReceiptNumber(orderIndex++),
                        sellerId: seller.userId,
                        customerId: customer ? customer.customerId : null,
                        orderDate,
                        totalAmount: finalTotal,
                        paidAmount,
                        balanceDue,
                        paymentStatus,
                        paymentDueDate: dueDate,
                        discountAmount,
                        taxAmount,
                        serviceFee,
                        paymentMethod: 'CASH',
                        order_items: {
                            create: orderItems,
                        },
                    },
                });
                if (customer && balanceDue > 0) {
                    await client_1.default.customer.update({
                        where: { customerId: customer.customerId },
                        data: { totalDebt: { increment: balanceDue } },
                    });
                    if (paidAmount > 0) {
                        await client_1.default.customerPayment.create({
                            data: {
                                paymentNumber: `CPAY-${orderDate.toISOString().slice(0, 10).replace(/-/g, '')}-${orderIndex}`,
                                customerId: customer.customerId,
                                orderId: order.orderId,
                                amount: paidAmount,
                                paymentMethod: 'CASH',
                                notes: 'Deposit paid at POS checkout',
                                createdBy: seller.userId,
                            },
                        });
                    }
                }
                orders.push(order);
            }
        }
        console.log(`   Created ${orders.length} orders with customer debt balances`);
    }
}
exports.OrderSeeder = OrderSeeder;
//# sourceMappingURL=order.seeder.js.map