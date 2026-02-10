import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const deviceId = '645654646';
    const customer = await prisma.customer.findUnique({
        where: { deviceId }
    });

    if (!customer) {
        console.log('Customer not found for deviceId:', deviceId);
        return;
    }

    const link = await prisma.customerTelegramLink.findUnique({
        where: { customerId: customer.customerId }
    });

    console.log('Customer:', customer);
    console.log('Link:', link ? {
        ...link,
        telegramChatId: link.telegramChatId.toString(),
        telegramUserId: link.telegramUserId?.toString()
    } : 'No link');

    const delivery = await prisma.receiptDelivery.findMany({
        where: { orderId: 90 }
    });

    console.log('Deliveries for Order 90:', delivery.map(d => ({
        ...d,
        telegramChatId: d.telegramChatId.toString()
    })));
}

main().catch(console.error).finally(() => prisma.$disconnect());
