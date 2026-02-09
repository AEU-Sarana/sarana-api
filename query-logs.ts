
import 'module-alias/register';
import prisma from './src/database/client';

async function main() {
    const logs = await prisma.auditLog.findMany({
        where: {
            action: { in: ['TELEGRAM_REPORT_SENT', 'TELEGRAM_REPORT_FAILED'] }
        },
        orderBy: { createdAt: 'desc' },
        take: 10,
        include: { users: { select: { username: true } } }
    });

    console.log(JSON.stringify(logs, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
