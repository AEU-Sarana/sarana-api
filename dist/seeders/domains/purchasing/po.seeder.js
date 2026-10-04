"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PurchaseOrderSeeder = void 0;
const base_seeder_1 = require("../../base-seeder");
const client_1 = __importDefault(require("../../../database/client"));
class PurchaseOrderSeeder extends base_seeder_1.BaseSeeder {
    constructor() {
        super(...arguments);
        this.name = 'Purchase Orders';
    }
    async seed() {
        const adminUser = await client_1.default.user.findFirst({
            where: { role: 'ADMIN' },
        });
        if (!adminUser) {
            console.log('   Skipping PO Seeder: No admin user found');
            return;
        }
        const suppliers = await client_1.default.supplier.findMany();
        if (suppliers.length === 0) {
            console.log('   Skipping PO Seeder: No suppliers found');
            return;
        }
        const products = await client_1.default.product.findMany({ take: 10 });
        if (products.length === 0) {
            console.log('   Skipping PO Seeder: No products found');
            return;
        }
        const s1 = suppliers[0];
        const s2 = suppliers[1];
        const s3 = suppliers[2];
        const p1 = products[0];
        const p2 = products[1] || products[0];
        const p3 = products[2] || products[0];
        // PO 1: RECEIVED (Completed & PAID in full)
        const po1 = await client_1.default.purchaseOrder.create({
            data: {
                poNumber: 'PO-20260816-0001',
                supplierId: s1.supplierId,
                status: 'RECEIVED',
                orderDate: new Date(Date.now() - 7 * 24 * 3600 * 1000),
                expectedDeliveryDate: new Date(Date.now() - 2 * 24 * 3600 * 1000),
                subtotal: 450.00,
                taxAmount: 22.50,
                discountAmount: 10.00,
                totalAmount: 462.50,
                paidAmount: 462.50,
                balanceDue: 0.00,
                paymentStatus: 'PAID',
                paymentMethod: 'ABA_BANK',
                paymentDueDate: new Date(Date.now() + 23 * 24 * 3600 * 1000),
                notes: 'Urgent restock for antibiotics and painkillers.',
                createdBy: adminUser.userId,
                approvedBy: adminUser.userId,
                purchase_order_items: {
                    create: [
                        {
                            productId: p1.productId,
                            orderedQuantity: 100,
                            receivedQuantity: 100,
                            unitCost: 3.50,
                            subtotal: 350.00,
                        },
                        {
                            productId: p2.productId,
                            orderedQuantity: 50,
                            receivedQuantity: 50,
                            unitCost: 2.00,
                            subtotal: 100.00,
                        },
                    ],
                },
            },
        });
        // Record payment for PO 1
        await client_1.default.supplierPayment.create({
            data: {
                paymentNumber: 'PAY-20260816-0001',
                supplierId: s1.supplierId,
                poId: po1.poId,
                amount: 462.50,
                paymentMethod: 'ABA_BANK',
                referenceNumber: 'TRX-ABA-98124',
                notes: 'Paid via ABA Mobile Transfer',
                createdBy: adminUser.userId,
            },
        });
        // Create Goods Received record for PO 1
        await client_1.default.goodsReceived.create({
            data: {
                grNumber: 'GR-20260816-0001',
                poId: po1.poId,
                supplierId: s1.supplierId,
                invoiceNumber: 'INV-PHARMA-9912',
                totalReceivedAmount: 462.50,
                receivedBy: adminUser.userId,
                goods_received_items: {
                    create: [
                        {
                            productId: p1.productId,
                            quantityReceived: 100,
                            unitCost: 3.50,
                            subtotal: 350.00,
                            batchNumber: 'BATCH-2026-A',
                            expiryDate: new Date(Date.now() + 365 * 24 * 3600 * 1000),
                        },
                        {
                            productId: p2.productId,
                            quantityReceived: 50,
                            unitCost: 2.00,
                            subtotal: 100.00,
                            batchNumber: 'BATCH-2026-B',
                            expiryDate: new Date(Date.now() + 500 * 24 * 3600 * 1000),
                        },
                    ],
                },
            },
        });
        // PO 2: PARTIAL_RECEIVED (Deposit paid $100, Balance Due $200)
        const po2 = await client_1.default.purchaseOrder.create({
            data: {
                poNumber: 'PO-20260816-0002',
                supplierId: s2.supplierId,
                status: 'PARTIAL_RECEIVED',
                orderDate: new Date(Date.now() - 3 * 24 * 3600 * 1000),
                expectedDeliveryDate: new Date(Date.now() + 2 * 24 * 3600 * 1000),
                subtotal: 300.00,
                taxAmount: 0.00,
                discountAmount: 0.00,
                totalAmount: 300.00,
                paidAmount: 100.00,
                balanceDue: 200.00,
                paymentStatus: 'PARTIAL',
                paymentMethod: 'CASH',
                paymentDueDate: new Date(Date.now() + 27 * 24 * 3600 * 1000),
                notes: 'Partial shipment expected first batch.',
                createdBy: adminUser.userId,
                approvedBy: adminUser.userId,
                purchase_order_items: {
                    create: [
                        {
                            productId: p2.productId,
                            orderedQuantity: 100,
                            receivedQuantity: 50,
                            unitCost: 3.00,
                            subtotal: 300.00,
                        },
                    ],
                },
            },
        });
        await client_1.default.supplierPayment.create({
            data: {
                paymentNumber: 'PAY-20260816-0002',
                supplierId: s2.supplierId,
                poId: po2.poId,
                amount: 100.00,
                paymentMethod: 'CASH',
                notes: 'Upfront deposit paid upon order creation',
                createdBy: adminUser.userId,
            },
        });
        await client_1.default.supplier.update({
            where: { supplierId: s2.supplierId },
            data: { totalDebt: 200.00 },
        });
        // PO 3: APPROVED (Pending Delivery, 100% DEBT - Overdue test sample)
        const po3 = await client_1.default.purchaseOrder.create({
            data: {
                poNumber: 'PO-20260816-0003',
                supplierId: s3.supplierId,
                status: 'APPROVED',
                orderDate: new Date(Date.now() - 35 * 24 * 3600 * 1000),
                expectedDeliveryDate: new Date(Date.now() - 30 * 24 * 3600 * 1000),
                subtotal: 620.00,
                taxAmount: 31.00,
                discountAmount: 15.00,
                totalAmount: 636.00,
                paidAmount: 0.00,
                balanceDue: 636.00,
                paymentStatus: 'UNPAID',
                paymentMethod: 'CREDIT_TERMS',
                paymentDueDate: new Date(Date.now() - 5 * 24 * 3600 * 1000), // 5 days overdue
                notes: 'Monthly bulk medical supplies order.',
                createdBy: adminUser.userId,
                approvedBy: adminUser.userId,
                purchase_order_items: {
                    create: [
                        {
                            productId: p3.productId,
                            orderedQuantity: 200,
                            receivedQuantity: 0,
                            unitCost: 3.10,
                            subtotal: 620.00,
                        },
                    ],
                },
            },
        });
        await client_1.default.supplier.update({
            where: { supplierId: s3.supplierId },
            data: { totalDebt: 636.00 },
        });
        // PO 4: DRAFT
        await client_1.default.purchaseOrder.create({
            data: {
                poNumber: 'PO-20260816-0004',
                supplierId: s1.supplierId,
                status: 'DRAFT',
                orderDate: new Date(),
                subtotal: 150.00,
                taxAmount: 0.00,
                discountAmount: 0.00,
                totalAmount: 150.00,
                paidAmount: 0.00,
                balanceDue: 150.00,
                paymentStatus: 'UNPAID',
                paymentMethod: 'ON_CREDIT',
                paymentDueDate: new Date(Date.now() + 30 * 24 * 3600 * 1000),
                notes: 'Draft order pending manager review.',
                createdBy: adminUser.userId,
                purchase_order_items: {
                    create: [
                        {
                            productId: p1.productId,
                            orderedQuantity: 30,
                            receivedQuantity: 0,
                            unitCost: 5.00,
                            subtotal: 150.00,
                        },
                    ],
                },
            },
        });
        console.log('   Seeded 4 purchase orders with debt balances and payment histories');
    }
}
exports.PurchaseOrderSeeder = PurchaseOrderSeeder;
//# sourceMappingURL=po.seeder.js.map