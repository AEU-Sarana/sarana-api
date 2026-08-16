import { BaseSeeder } from '../../base-seeder';
import prisma from '../../../database/client';

export class PurchaseOrderSeeder extends BaseSeeder {
  name = 'Purchase Orders';

  async seed(): Promise<void> {
    const adminUser = await prisma.user.findFirst({
      where: { role: 'ADMIN' },
    });
    if (!adminUser) {
      console.log('   Skipping PO Seeder: No admin user found');
      return;
    }

    const suppliers = await prisma.supplier.findMany();
    if (suppliers.length === 0) {
      console.log('   Skipping PO Seeder: No suppliers found');
      return;
    }

    const products = await prisma.product.findMany({ take: 10 });
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

    // PO 1: RECEIVED (Completed)
    const po1 = await prisma.purchaseOrder.create({
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

    // Create Goods Received record for PO 1
    await prisma.goodsReceived.create({
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

    // PO 2: PARTIAL_RECEIVED
    await prisma.purchaseOrder.create({
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

    // PO 3: APPROVED (Pending Delivery)
    await prisma.purchaseOrder.create({
      data: {
        poNumber: 'PO-20260816-0003',
        supplierId: s3.supplierId,
        status: 'APPROVED',
        orderDate: new Date(Date.now() - 1 * 24 * 3600 * 1000),
        expectedDeliveryDate: new Date(Date.now() + 5 * 24 * 3600 * 1000),
        subtotal: 620.00,
        taxAmount: 31.00,
        discountAmount: 15.00,
        totalAmount: 636.00,
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

    // PO 4: DRAFT
    await prisma.purchaseOrder.create({
      data: {
        poNumber: 'PO-20260816-0004',
        supplierId: s1.supplierId,
        status: 'DRAFT',
        orderDate: new Date(),
        subtotal: 150.00,
        taxAmount: 0.00,
        discountAmount: 0.00,
        totalAmount: 150.00,
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

    console.log('   Seeded 4 purchase orders with items and receiving history');
  }
}
