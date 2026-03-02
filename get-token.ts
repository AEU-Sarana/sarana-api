import { PrismaClient } from './src/database/generated';
import { decrypt } from './src/shared/utils/encryption';
import * as dotenv from 'dotenv';
dotenv.config();

const prisma = new PrismaClient();

async function main() {
    const config = await prisma.telegramConfig.findFirst();
    if (!config) {
        console.log('No Telegram config found');
        return;
    }
    const token = decrypt(config.botToken, process.env.ENCRYPTION_KEY!);
    console.log('BOT_TOKEN=' + token);
}

main().catch(console.error).finally(() => prisma.$disconnect());
