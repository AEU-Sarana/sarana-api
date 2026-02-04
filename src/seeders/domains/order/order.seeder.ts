import { BaseSeeder } from '../../base-seeder';
import prisma from '../../../database/client';
import { SeederHelper } from '../utils/seeder-helper';
import { DataGenerator } from '../utils/data-generator';

export class OrderSeeder extends BaseSeeder {
  name = 'Orders';

  async seed(): Promise<void> {
    const shifts = await prisma.shift.findMany({
      where: { status: 'CLOSED' },
      select: { shiftId: true, sellerId: true },
    });

    if (shifts.length === 0) {
      console.log('   ⚠️  No closed shifts found. Skipping order seeding.');
      return;
    }

    const productIds = await SeederHelper.getProductIds();
    if (productIds.length === 0) {
      console.log('   ⚠️  No products found. Skipping order seeding.');
      return;
    }

    const orders = [];
    let orderIndex = 0;

    for (const shift of shifts) {
      // Create 5-15 orders per shift
      const orderCount = SeederHelper.randomInt(5, 15);
      
      for (let i = 0; i < orderCount; i++) {
        const orderDate = new Date();
        orderDate.setDate(orderDate.getDate() - SeederHelper.randomInt(0, 30));
        
        // Create order items (1-5 items per order)
        const itemCount = SeederHelper.randomInt(1, 5);
        const orderItems = [];
        let totalAmount = 0;
        
        for (let j = 0; j < itemCount; j++) {
          const productId = SeederHelper.randomElement(productIds);
          const product = await prisma.product.findUnique({
            where: { productId },
            select: { productName: true, price: true, avgCost: true, lastPurchaseCost: true },
          });
          
          if (!product) continue;
          
          const quantity = SeederHelper.randomInt(1, 5);
          const unitPrice = Number(product.price);
          const costPerUnitAtSale = Number(product.avgCost ?? product.lastPurchaseCost ?? 0);
          const discountAmount = SeederHelper.randomFloat(0, unitPrice * 0.1);
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
        
        if (orderItems.length === 0) continue;
        
        const discountAmount = SeederHelper.randomFloat(0, totalAmount * 0.05);
        const taxAmount = (totalAmount - discountAmount) * 0.1;
        const serviceFee = SeederHelper.randomFloat(0, 10);
        const finalTotal = totalAmount - discountAmount + taxAmount + serviceFee;
        
        const order = await prisma.order.create({
          data: {
            orderUuid: DataGenerator.generateOrderUUID(),
            receiptNumber: DataGenerator.generateReceiptNumber(orderIndex++),
            shiftId: shift.shiftId,
            sellerId: shift.sellerId,
            orderDate,
            totalAmount: finalTotal,
            discountAmount,
            taxAmount,
            serviceFee,
            paymentMethod: 'CASH',
            orderItems: {
              create: orderItems,
            },
          },
        });
        
        orders.push(order);
      }
    }

    console.log(`   Created ${orders.length} orders`);
  }
}