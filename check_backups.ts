import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkBackups() {
    try {
        const runs = await prisma.$queryRaw`SELECT * FROM backup_runs ORDER BY started_at DESC LIMIT 5`;
        console.log(JSON.stringify(runs, null, 2));
    } catch (err) {
        console.error(err);
    } finally {
        await prisma.$disconnect();
    }
}

checkBackups();
