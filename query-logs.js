
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const logs = await prisma.audit_logs.findMany({
        where: {
            action: { in: ['TELEGRAM_REPORT_SENT', 'TELEGRAM_REPORT_FAILED'] }
        },
        orderBy: { created_at: 'desc' },
        take: 10,
        include: { users: { select: { username: true } } }
    });

    console.log(JSON.stringify(logs, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
