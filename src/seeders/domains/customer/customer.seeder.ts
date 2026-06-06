import { BaseSeeder } from '../../base-seeder';
import prisma from '../../../database/client';
import { DataGenerator } from '../utils/data-generator';

export class CustomerSeeder extends BaseSeeder {
  name = 'Customers';

  async seed(): Promise<void> {
    // Clear existing customers
    await this.clearTable('customers');
    await this.clearTable('customer_telegram_links');
    await this.clearTable('receipt_deliveries'); // clear mock receipt deliveries too

    const firstNames = [
      'Sok', 'Chan', 'Srey', 'Dara', 'Ratha', 'Sopheap', 'Sophat', 'Sreyneang',
      'Sreyroth', 'Sreymom', 'Sreypich', 'Sreykeo', 'Sreyleak', 'Sreynich'
    ];
    const lastNames = [
      'Chan', 'Sok', 'Dara', 'Ratha', 'Sopheap', 'Sophat', 'Srey', 'Kong',
      'Heng', 'Hak', 'Rith', 'Soth'
    ];

    const customers = [];

    // Create 15 customers
    for (let i = 0; i < 15; i++) {
      const fullName = `${firstNames[i % firstNames.length]} ${lastNames[i % lastNames.length]}`;
      const phone = DataGenerator.generatePhoneNumber();
      const username = fullName.toLowerCase().replace(/\s+/g, '.');
      const email = DataGenerator.generateEmail(username);
      const deviceId = DataGenerator.generateDeviceId();

      const customer = await prisma.customer.create({
        data: {
          fullName,
          phone: i % 4 === 0 ? null : phone, // some null phones
          email: i % 3 === 0 ? null : email, // some null emails
          deviceId,
        },
      });
      customers.push(customer);
    }

    // Link some customers to Telegram (e.g. 8 of them)
    // and link them to orders so they have purchase histories
    const orders = await prisma.order.findMany({
      orderBy: { orderId: 'asc' },
      take: 20
    });

    for (let i = 0; i < 8; i++) {
      const customer = customers[i];
      const chatId = 100000000 + i * 12345;
      const userId = 200000000 + i * 54321;

      // 1. Create Telegram link
      await prisma.customerTelegramLink.create({
        data: {
          customerId: customer.customerId,
          telegramChatId: BigInt(chatId),
          telegramUserId: BigInt(userId),
        },
      });

      // 2. Deliver some orders to this chat ID (creates purchase history)
      // Customer 0 gets order 0 and 1
      // Customer 1 gets order 2
      // etc.
      const assignedOrders = orders.slice(i * 2, i * 2 + 2);
      for (const order of assignedOrders) {
        await prisma.receiptDelivery.create({
          data: {
            orderId: order.orderId,
            telegramChatId: BigInt(chatId),
            status: 'SENT',
            sentAt: new Date(),
          },
        });
      }
    }

    console.log(`   Created/Updated ${customers.length} customers`);
  }
}
