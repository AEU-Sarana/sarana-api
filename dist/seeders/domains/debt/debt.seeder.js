"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DebtSeeder = void 0;
const client_1 = __importDefault(require("../../../database/client"));
const base_seeder_1 = require("../../base-seeder");
/**
 * Generate a realistic SVG payment receipt proof data URL
 */
function generateSlipDataUrl(title, amount, ref, method, date) {
    const headerBg = method === 'ABA_BANK' ? '#004f71' : method === 'WING' ? '#78be20' : '#1e293b';
    const headerBg2 = method === 'ABA_BANK' ? '#002f43' : method === 'WING' ? '#4d8010' : '#0f172a';
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="500" height="660" viewBox="0 0 500 660">
    <defs>
      <linearGradient id="hdr" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="${headerBg}" />
        <stop offset="100%" stop-color="${headerBg2}" />
      </linearGradient>
    </defs>
    <rect width="500" height="660" rx="24" fill="#f8fafc" />
    <rect width="500" height="150" rx="24" fill="url(#hdr)" />
    <circle cx="250" cy="150" r="42" fill="#ffffff" filter="drop-shadow(0 4px 8px rgba(0,0,0,0.12))" />
    <text x="250" y="159" font-family="-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif" font-size="28" font-weight="900" text-anchor="middle" fill="#10b981">✓</text>
    
    <text x="250" y="62" font-family="-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif" font-size="16" font-weight="800" text-anchor="middle" fill="#ffffff" letter-spacing="1">${title.toUpperCase()}</text>
    <text x="250" y="90" font-family="-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif" font-size="12" text-anchor="middle" fill="rgba(255,255,255,0.85)">Payment Transfer Receipt</text>
    
    <text x="250" y="235" font-family="-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif" font-size="13" font-weight="600" text-anchor="middle" fill="#64748b">AMOUNT PAID</text>
    <text x="250" y="278" font-family="-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif" font-size="34" font-weight="900" text-anchor="middle" fill="#0f172a">$${amount}</text>
    
    <!-- Details Card -->
    <rect x="36" y="315" width="428" height="260" rx="16" fill="#ffffff" stroke="#e2e8f0" stroke-width="1.5" />
    
    <text x="64" y="358" font-family="-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif" font-size="13" fill="#64748b">Payment Channel</text>
    <text x="436" y="358" font-family="-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif" font-size="13" font-weight="700" text-anchor="end" fill="#0f172a">${method}</text>
    <line x1="64" y1="376" x2="436" y2="376" stroke="#f1f5f9" stroke-width="1.5" />
    
    <text x="64" y="410" font-family="-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif" font-size="13" fill="#64748b">Reference / TXN ID</text>
    <text x="436" y="410" font-family="Courier, monospace" font-size="13" font-weight="800" text-anchor="end" fill="#0284c7">${ref}</text>
    <line x1="64" y1="428" x2="436" y2="428" stroke="#f1f5f9" stroke-width="1.5" />
    
    <text x="64" y="462" font-family="-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif" font-size="13" fill="#64748b">Date &amp; Time</text>
    <text x="436" y="462" font-family="-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif" font-size="13" font-weight="600" text-anchor="end" fill="#0f172a">${date}</text>
    <line x1="64" y1="480" x2="436" y2="480" stroke="#f1f5f9" stroke-width="1.5" />
    
    <text x="64" y="514" font-family="-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif" font-size="13" fill="#64748b">Transfer Status</text>
    <text x="436" y="514" font-family="-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif" font-size="13" font-weight="800" text-anchor="end" fill="#10b981">SUCCESSFUL</text>
    <line x1="64" y1="532" x2="436" y2="532" stroke="#f1f5f9" stroke-width="1.5" />
    
    <text x="64" y="556" font-family="-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif" font-size="11" fill="#94a3b8">Processed &amp; Verified by Sarana POS Gateway</text>
    
    <text x="250" y="618" font-family="-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif" font-size="11" text-anchor="middle" fill="#94a3b8">This electronic slip serves as official proof of payment.</text>
  </svg>`;
    return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}
class DebtSeeder extends base_seeder_1.BaseSeeder {
    constructor() {
        super(...arguments);
        this.name = 'Customer & Supplier Debt Seeder';
    }
    async seed() {
        const adminUser = await client_1.default.user.findFirst({
            where: { role: 'ADMIN' },
        });
        const seller = adminUser || (await client_1.default.user.findFirst());
        if (!seller) {
            console.log('   Skipping Debt Seeder: No admin or user found in DB');
            return;
        }
        const products = await client_1.default.product.findMany({ take: 10 });
        if (products.length === 0) {
            console.log('   Skipping Debt Seeder: No products found in DB');
            return;
        }
        console.log('   Cleaning existing customer & supplier debt test data...');
        // Safely remove prior debt records to avoid duplicate key conflicts
        await client_1.default.customerPayment.deleteMany({});
        await client_1.default.supplierPayment.deleteMany({});
        await client_1.default.orderItem.deleteMany({
            where: { order: { receiptNumber: { startsWith: 'REC-DEBT-' } } },
        });
        await client_1.default.order.deleteMany({
            where: { receiptNumber: { startsWith: 'REC-DEBT-' } },
        });
        await client_1.default.purchaseOrderItem.deleteMany({
            where: { purchaseOrder: { poNumber: { startsWith: 'PO-DEBT-' } } },
        });
        await client_1.default.purchaseOrder.deleteMany({
            where: { poNumber: { startsWith: 'PO-DEBT-' } },
        });
        // =========================================================================
        // SECTION 1: CUSTOMERS & CUSTOMER DEBT
        // =========================================================================
        console.log('   Seeding Customers with Outstanding Debt & Payment Proofs...');
        const customerData = [
            {
                fullName: 'Sokha Pich',
                phone: '012 889 911',
                email: 'sokha.pich@gmail.com',
                deviceId: 'DEV-CUST-001',
                totalDebt: 185.50,
                orders: [
                    {
                        receiptNumber: 'REC-DEBT-001',
                        orderDate: new Date(Date.now() - 40 * 24 * 3600 * 1000),
                        paymentDueDate: new Date(Date.now() - 10 * 24 * 3600 * 1000), // Overdue by 10 days
                        totalAmount: 110.50,
                        paidAmount: 0.00,
                        balanceDue: 110.50,
                        paymentStatus: 'UNPAID',
                        paymentMethod: 'ON_CREDIT',
                        items: [
                            { productId: products[0].productId, productName: products[0].productName, quantity: 2, unitPrice: 35.00, subtotal: 70.00 },
                            { productId: products[1 % products.length].productId, productName: products[1 % products.length].productName, quantity: 3, unitPrice: 13.50, subtotal: 40.50 },
                        ],
                    },
                    {
                        receiptNumber: 'REC-DEBT-002',
                        orderDate: new Date(Date.now() - 20 * 24 * 3600 * 1000),
                        paymentDueDate: new Date(Date.now() - 5 * 24 * 3600 * 1000), // Overdue by 5 days
                        totalAmount: 125.00,
                        paidAmount: 50.00,
                        balanceDue: 75.00,
                        paymentStatus: 'PARTIAL',
                        paymentMethod: 'ABA_BANK',
                        items: [
                            { productId: products[2 % products.length].productId, productName: products[2 % products.length].productName, quantity: 5, unitPrice: 25.00, subtotal: 125.00 },
                        ],
                        payment: {
                            paymentNumber: 'CPAY-202610-0001',
                            amount: 50.00,
                            paymentMethod: 'ABA_BANK',
                            referenceNumber: 'ABA-881920',
                            paymentDate: new Date(Date.now() - 20 * 24 * 3600 * 1000),
                            notes: 'Initial deposit paid via ABA Mobile QR',
                            slipProof: generateSlipDataUrl('ABA BANK TRANSFER', '50.00', 'ABA-881920', 'ABA_BANK', '2026-09-28 14:22'),
                        },
                    },
                ],
            },
            {
                fullName: 'Channary Voeun',
                phone: '097 554 123',
                email: 'channary.voeun@yahoo.com',
                deviceId: 'DEV-CUST-002',
                totalDebt: 340.00,
                orders: [
                    {
                        receiptNumber: 'REC-DEBT-003',
                        orderDate: new Date(Date.now() - 10 * 24 * 3600 * 1000),
                        paymentDueDate: new Date(Date.now() + 20 * 24 * 3600 * 1000), // Due in 20 days
                        totalAmount: 400.00,
                        paidAmount: 100.00,
                        balanceDue: 300.00,
                        paymentStatus: 'PARTIAL',
                        paymentMethod: 'WING',
                        items: [
                            { productId: products[3 % products.length].productId, productName: products[3 % products.length].productName, quantity: 10, unitPrice: 40.00, subtotal: 400.00 },
                        ],
                        payment: {
                            paymentNumber: 'CPAY-202610-0002',
                            amount: 100.00,
                            paymentMethod: 'WING',
                            referenceNumber: 'WING-992104',
                            paymentDate: new Date(Date.now() - 10 * 24 * 3600 * 1000),
                            notes: 'First installment via Wing Bank',
                            slipProof: generateSlipDataUrl('WING BANK PAYMENT', '100.00', 'WING-992104', 'WING', '2026-10-08 10:15'),
                        },
                    },
                    {
                        receiptNumber: 'REC-DEBT-004',
                        orderDate: new Date(Date.now() - 5 * 24 * 3600 * 1000),
                        paymentDueDate: new Date(Date.now() + 25 * 24 * 3600 * 1000), // Due in 25 days
                        totalAmount: 90.00,
                        paidAmount: 50.00,
                        balanceDue: 40.00,
                        paymentStatus: 'PARTIAL',
                        paymentMethod: 'CASH',
                        items: [
                            { productId: products[4 % products.length].productId, productName: products[4 % products.length].productName, quantity: 2, unitPrice: 45.00, subtotal: 90.00 },
                        ],
                        payment: {
                            paymentNumber: 'CPAY-202610-0003',
                            amount: 50.00,
                            paymentMethod: 'CASH',
                            referenceNumber: 'CASH-POS-9812',
                            paymentDate: new Date(Date.now() - 5 * 24 * 3600 * 1000),
                            notes: 'Cash deposit paid at store checkout',
                            slipProof: null,
                        },
                    },
                ],
            },
            {
                fullName: 'Borey Heng (Wholesale Clinic)',
                phone: '085 332 190',
                email: 'borey.clinic@gmail.com',
                deviceId: 'DEV-CUST-003',
                totalDebt: 720.00,
                orders: [
                    {
                        receiptNumber: 'REC-DEBT-005',
                        orderDate: new Date(Date.now() - 15 * 24 * 3600 * 1000),
                        paymentDueDate: new Date(Date.now() + 15 * 24 * 3600 * 1000),
                        totalAmount: 1200.00,
                        paidAmount: 480.00,
                        balanceDue: 720.00,
                        paymentStatus: 'PARTIAL',
                        paymentMethod: 'ABA_BANK',
                        items: [
                            { productId: products[0].productId, productName: products[0].productName, quantity: 20, unitPrice: 40.00, subtotal: 800.00 },
                            { productId: products[1 % products.length].productId, productName: products[1 % products.length].productName, quantity: 10, unitPrice: 40.00, subtotal: 400.00 },
                        ],
                        payment: {
                            paymentNumber: 'CPAY-202610-0004',
                            amount: 480.00,
                            paymentMethod: 'ABA_BANK',
                            referenceNumber: 'TRX-ABA-559123',
                            paymentDate: new Date(Date.now() - 15 * 24 * 3600 * 1000),
                            notes: 'Wholesale batch order 40% deposit via ABA transfer',
                            slipProof: generateSlipDataUrl('ABA BANK TRANSFER', '480.00', 'TRX-ABA-559123', 'ABA_BANK', '2026-10-03 16:45'),
                        },
                    },
                ],
            },
            {
                fullName: 'Sreymom Keo',
                phone: '016 778 844',
                email: 'sreymom.keo@gmail.com',
                deviceId: 'DEV-CUST-004',
                totalDebt: 95.00,
                orders: [
                    {
                        receiptNumber: 'REC-DEBT-006',
                        orderDate: new Date(Date.now() - 45 * 24 * 3600 * 1000),
                        paymentDueDate: new Date(Date.now() - 15 * 24 * 3600 * 1000), // Overdue by 15 days
                        totalAmount: 145.00,
                        paidAmount: 50.00,
                        balanceDue: 95.00,
                        paymentStatus: 'PARTIAL',
                        paymentMethod: 'BANK_TRANSFER',
                        items: [
                            { productId: products[2 % products.length].productId, productName: products[2 % products.length].productName, quantity: 5, unitPrice: 29.00, subtotal: 145.00 },
                        ],
                        payment: {
                            paymentNumber: 'CPAY-202610-0005',
                            amount: 50.00,
                            paymentMethod: 'BANK_TRANSFER',
                            referenceNumber: 'FT-CANADIA-00382',
                            paymentDate: new Date(Date.now() - 45 * 24 * 3600 * 1000),
                            notes: 'Down payment via Canadia Bank Transfer',
                            slipProof: generateSlipDataUrl('CANADIA BANK TRANSFER', '50.00', 'FT-CANADIA-00382', 'BANK_TRANSFER', '2026-09-03 11:30'),
                        },
                    },
                ],
            },
            {
                fullName: 'Rathana Sam (Fully Settled)',
                phone: '092 110 994',
                email: 'rathana.sam@gmail.com',
                deviceId: 'DEV-CUST-005',
                totalDebt: 0.00,
                orders: [
                    {
                        receiptNumber: 'REC-DEBT-007',
                        orderDate: new Date(Date.now() - 30 * 24 * 3600 * 1000),
                        paymentDueDate: new Date(Date.now() - 10 * 24 * 3600 * 1000),
                        totalAmount: 250.00,
                        paidAmount: 250.00,
                        balanceDue: 0.00,
                        paymentStatus: 'PAID',
                        paymentMethod: 'ABA_BANK',
                        items: [
                            { productId: products[3 % products.length].productId, productName: products[3 % products.length].productName, quantity: 5, unitPrice: 50.00, subtotal: 250.00 },
                        ],
                        payment: {
                            paymentNumber: 'CPAY-202610-0006',
                            amount: 250.00,
                            paymentMethod: 'ABA_BANK',
                            referenceNumber: 'ABA-112948',
                            paymentDate: new Date(Date.now() - 28 * 24 * 3600 * 1000),
                            notes: 'Full payment completed via ABA Mobile',
                            slipProof: generateSlipDataUrl('ABA BANK TRANSFER', '250.00', 'ABA-112948', 'ABA_BANK', '2026-09-20 09:18'),
                        },
                    },
                ],
            },
        ];
        for (const cData of customerData) {
            let customer = await client_1.default.customer.findFirst({
                where: { fullName: cData.fullName },
            });
            if (!customer) {
                customer = await client_1.default.customer.create({
                    data: {
                        fullName: cData.fullName,
                        phone: cData.phone,
                        email: cData.email,
                        deviceId: cData.deviceId,
                        totalDebt: cData.totalDebt,
                    },
                });
            }
            else {
                await client_1.default.customer.update({
                    where: { customerId: customer.customerId },
                    data: { totalDebt: cData.totalDebt },
                });
            }
            for (const oData of cData.orders) {
                const order = await client_1.default.order.create({
                    data: {
                        receiptNumber: oData.receiptNumber,
                        sellerId: seller.userId,
                        customerId: customer.customerId,
                        orderDate: oData.orderDate,
                        totalAmount: oData.totalAmount,
                        paidAmount: oData.paidAmount,
                        balanceDue: oData.balanceDue,
                        paymentStatus: oData.paymentStatus,
                        paymentMethod: oData.paymentMethod === 'CASH' ? 'CASH' : 'BANK',
                        paymentDueDate: oData.paymentDueDate,
                        discountAmount: 0,
                        taxAmount: 0,
                        serviceFee: 0,
                        order_items: {
                            create: oData.items.map((it) => ({
                                productId: it.productId,
                                productName: it.productName,
                                quantity: it.quantity,
                                unitPrice: it.unitPrice,
                                costPerUnitAtSale: it.unitPrice * 0.7,
                                cogsLineTotal: it.unitPrice * 0.7 * it.quantity,
                                discountAmount: 0,
                                subtotal: it.subtotal,
                            })),
                        },
                    },
                });
                if (oData.payment) {
                    await client_1.default.customerPayment.create({
                        data: {
                            paymentNumber: oData.payment.paymentNumber,
                            customerId: customer.customerId,
                            orderId: order.orderId,
                            amount: oData.payment.amount,
                            paymentMethod: oData.payment.paymentMethod,
                            referenceNumber: oData.payment.referenceNumber,
                            attachmentUrl: oData.payment.slipProof,
                            paymentDate: oData.payment.paymentDate,
                            notes: oData.payment.notes,
                            createdBy: seller.userId,
                        },
                    });
                }
            }
        }
        console.log(`   Seeded 5 customers with open orders, debts, and slip proofs.`);
        // =========================================================================
        // SECTION 2: SUPPLIERS & SUPPLIER DEBT
        // =========================================================================
        console.log('   Seeding Suppliers with Outstanding Payables & Payment Proofs...');
        const supplierData = [
            {
                companyName: 'DKSH Pharma Cambodia Co., Ltd.',
                contactPerson: 'Mr. Bunthan Lim',
                phone: '023 212 999',
                email: 'orders.kh@dksh.com',
                address: 'Russian Federation Blvd, Sangkat Teuk Thla, Phnom Penh',
                taxId: 'K009-9021881',
                paymentTerms: 'NET_30',
                totalDebt: 1850.00,
                purchaseOrders: [
                    {
                        poNumber: 'PO-DEBT-001',
                        orderDate: new Date(Date.now() - 38 * 24 * 3600 * 1000),
                        paymentDueDate: new Date(Date.now() - 8 * 24 * 3600 * 1000), // Overdue by 8 days
                        status: 'RECEIVED',
                        subtotal: 1500.00,
                        totalAmount: 1500.00,
                        paidAmount: 500.00,
                        balanceDue: 1000.00,
                        paymentStatus: 'PARTIAL',
                        paymentMethod: 'ABA_BANK',
                        notes: 'Monthly antibiotics & essential injectables restock',
                        items: [
                            { productId: products[0].productId, orderedQuantity: 200, unitCost: 5.00, subtotal: 1000.00 },
                            { productId: products[1 % products.length].productId, orderedQuantity: 100, unitCost: 5.00, subtotal: 500.00 },
                        ],
                        payment: {
                            paymentNumber: 'PAY-DEBT-001',
                            amount: 500.00,
                            paymentMethod: 'ABA_BANK',
                            referenceNumber: 'TRX-ABA-984712',
                            paymentDate: new Date(Date.now() - 35 * 24 * 3600 * 1000),
                            notes: '33% partial advance paid via ABA Business Banking',
                            slipProof: generateSlipDataUrl('ABA BUSINESS BANKING', '500.00', 'TRX-ABA-984712', 'ABA_BANK', '2026-09-13 15:40'),
                        },
                    },
                    {
                        poNumber: 'PO-DEBT-002',
                        orderDate: new Date(Date.now() - 16 * 24 * 3600 * 1000),
                        paymentDueDate: new Date(Date.now() + 14 * 24 * 3600 * 1000), // Due in 14 days
                        status: 'APPROVED',
                        subtotal: 850.00,
                        totalAmount: 850.00,
                        paidAmount: 0.00,
                        balanceDue: 850.00,
                        paymentStatus: 'UNPAID',
                        paymentMethod: 'ON_CREDIT',
                        notes: 'Secondary batch order for vitamins & pediatric syrups',
                        items: [
                            { productId: products[2 % products.length].productId, orderedQuantity: 170, unitCost: 5.00, subtotal: 850.00 },
                        ],
                        payment: null,
                    },
                ],
            },
            {
                companyName: 'Zuellig Pharma Distribution Ltd.',
                contactPerson: 'Ms. Sovannary Keo',
                phone: '023 881 234',
                email: 'supply.cambodia@zuelligpharma.com',
                address: 'National Road 4, Sangkat Chaom Chau, Phnom Penh',
                taxId: 'K002-1184920',
                paymentTerms: 'NET_60',
                totalDebt: 2400.00,
                purchaseOrders: [
                    {
                        poNumber: 'PO-DEBT-003',
                        orderDate: new Date(Date.now() - 28 * 24 * 3600 * 1000),
                        paymentDueDate: new Date(Date.now() + 32 * 24 * 3600 * 1000), // Due in 32 days
                        status: 'RECEIVED',
                        subtotal: 3600.00,
                        totalAmount: 3600.00,
                        paidAmount: 1200.00,
                        balanceDue: 2400.00,
                        paymentStatus: 'PARTIAL',
                        paymentMethod: 'BANK_TRANSFER',
                        notes: 'Bulk cold-chain vaccine and oncology medication shipment',
                        items: [
                            { productId: products[3 % products.length].productId, orderedQuantity: 300, unitCost: 12.00, subtotal: 3600.00 },
                        ],
                        payment: {
                            paymentNumber: 'PAY-DEBT-002',
                            amount: 1200.00,
                            paymentMethod: 'BANK_TRANSFER',
                            referenceNumber: 'FT-ABA-772910',
                            paymentDate: new Date(Date.now() - 25 * 24 * 3600 * 1000),
                            notes: 'Initial 33% wire transfer paid on shipment dispatch',
                            slipProof: generateSlipDataUrl('TELEGRAPHIC TRANSFER', '1200.00', 'FT-ABA-772910', 'BANK_TRANSFER', '2026-09-23 11:15'),
                        },
                    },
                ],
            },
            {
                companyName: 'Mega Lifesciences (Cambodia)',
                contactPerson: 'Mr. David Srun',
                phone: '012 994 488',
                email: 'contact@megalife.com.kh',
                address: 'Vattanac Capital Tower, Level 14, Phnom Penh',
                taxId: 'K008-8839120',
                paymentTerms: 'NET_15',
                totalDebt: 680.00,
                purchaseOrders: [
                    {
                        poNumber: 'PO-DEBT-004',
                        orderDate: new Date(Date.now() - 23 * 24 * 3600 * 1000),
                        paymentDueDate: new Date(Date.now() - 8 * 24 * 3600 * 1000), // Overdue by 8 days
                        status: 'RECEIVED',
                        subtotal: 880.00,
                        totalAmount: 880.00,
                        paidAmount: 200.00,
                        balanceDue: 680.00,
                        paymentStatus: 'PARTIAL',
                        paymentMethod: 'WING',
                        notes: 'Wellness supplements, Nat C and Enat 400 delivery',
                        items: [
                            { productId: products[4 % products.length].productId, orderedQuantity: 110, unitCost: 8.00, subtotal: 880.00 },
                        ],
                        payment: {
                            paymentNumber: 'PAY-DEBT-003',
                            amount: 200.00,
                            paymentMethod: 'WING',
                            referenceNumber: 'WING-889412',
                            paymentDate: new Date(Date.now() - 20 * 24 * 3600 * 1000),
                            notes: 'Down payment paid via Wing Bank merchant app',
                            slipProof: generateSlipDataUrl('WING BANK TRANSFER', '200.00', 'WING-889412', 'WING', '2026-09-28 16:30'),
                        },
                    },
                ],
            },
            {
                companyName: 'MedSupply Asia Co.',
                contactPerson: 'Mr. Vicheka Meng',
                phone: '011 345 678',
                email: 'vicheka@medsupply.com.kh',
                address: 'Monivong Blvd, Daun Penh, Phnom Penh',
                taxId: 'K001-3829471',
                paymentTerms: 'NET_30',
                totalDebt: 0.00,
                purchaseOrders: [
                    {
                        poNumber: 'PO-DEBT-005',
                        orderDate: new Date(Date.now() - 30 * 24 * 3600 * 1000),
                        paymentDueDate: new Date(Date.now() - 5 * 24 * 3600 * 1000),
                        status: 'RECEIVED',
                        subtotal: 750.00,
                        totalAmount: 750.00,
                        paidAmount: 750.00,
                        balanceDue: 0.00,
                        paymentStatus: 'PAID',
                        paymentMethod: 'ABA_BANK',
                        notes: 'Consumables, syringes, and surgical gloves - Fully Settled',
                        items: [
                            { productId: products[5 % products.length].productId, orderedQuantity: 150, unitCost: 5.00, subtotal: 750.00 },
                        ],
                        payment: {
                            paymentNumber: 'PAY-DEBT-004',
                            amount: 750.00,
                            paymentMethod: 'ABA_BANK',
                            referenceNumber: 'ABA-554189',
                            paymentDate: new Date(Date.now() - 25 * 24 * 3600 * 1000),
                            notes: 'Full order settlement paid upon delivery reception',
                            slipProof: generateSlipDataUrl('ABA BANK TRANSFER', '750.00', 'ABA-554189', 'ABA_BANK', '2026-09-23 14:05'),
                        },
                    },
                ],
            },
        ];
        for (const sData of supplierData) {
            let supplier = await client_1.default.supplier.findFirst({
                where: { companyName: sData.companyName },
            });
            if (!supplier) {
                supplier = await client_1.default.supplier.create({
                    data: {
                        companyName: sData.companyName,
                        contactPerson: sData.contactPerson,
                        phone: sData.phone,
                        email: sData.email,
                        address: sData.address,
                        taxId: sData.taxId,
                        paymentTerms: sData.paymentTerms,
                        totalDebt: sData.totalDebt,
                        isActive: true,
                    },
                });
            }
            else {
                await client_1.default.supplier.update({
                    where: { supplierId: supplier.supplierId },
                    data: { totalDebt: sData.totalDebt, isActive: true },
                });
            }
            for (const poData of sData.purchaseOrders) {
                const po = await client_1.default.purchaseOrder.create({
                    data: {
                        poNumber: poData.poNumber,
                        supplierId: supplier.supplierId,
                        status: poData.status,
                        orderDate: poData.orderDate,
                        paymentDueDate: poData.paymentDueDate,
                        expectedDeliveryDate: new Date(poData.orderDate.getTime() + 5 * 24 * 3600 * 1000),
                        subtotal: poData.subtotal,
                        taxAmount: 0,
                        discountAmount: 0,
                        totalAmount: poData.totalAmount,
                        paidAmount: poData.paidAmount,
                        balanceDue: poData.balanceDue,
                        paymentStatus: poData.paymentStatus,
                        paymentMethod: poData.paymentMethod,
                        notes: poData.notes,
                        createdBy: seller.userId,
                        approvedBy: seller.userId,
                        purchase_order_items: {
                            create: poData.items.map((it) => ({
                                productId: it.productId,
                                orderedQuantity: it.orderedQuantity,
                                receivedQuantity: poData.status === 'RECEIVED' ? it.orderedQuantity : 0,
                                unitCost: it.unitCost,
                                subtotal: it.subtotal,
                            })),
                        },
                    },
                });
                if (poData.payment) {
                    await client_1.default.supplierPayment.create({
                        data: {
                            paymentNumber: poData.payment.paymentNumber,
                            supplierId: supplier.supplierId,
                            poId: po.poId,
                            amount: poData.payment.amount,
                            paymentMethod: poData.payment.paymentMethod,
                            referenceNumber: poData.payment.referenceNumber,
                            attachmentUrl: poData.payment.slipProof,
                            paymentDate: poData.payment.paymentDate,
                            notes: poData.payment.notes,
                            createdBy: seller.userId,
                        },
                    });
                }
            }
        }
        console.log(`   Seeded 4 suppliers with purchase orders, payables, and slip proofs.`);
    }
}
exports.DebtSeeder = DebtSeeder;
// Support running directly via: npx tsx src/seeders/domains/debt/debt.seeder.ts
if (require.main === module) {
    const seeder = new DebtSeeder();
    seeder
        .run()
        .then(async () => {
        console.log('🎉 Debt Seeding Finished Successfully!');
        await client_1.default.$disconnect();
        process.exit(0);
    })
        .catch(async (err) => {
        console.error('❌ Debt Seeding Failed:', err);
        await client_1.default.$disconnect();
        process.exit(1);
    });
}
//# sourceMappingURL=debt.seeder.js.map