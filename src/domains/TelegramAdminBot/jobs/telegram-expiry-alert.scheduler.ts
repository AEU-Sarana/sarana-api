import { logger } from '@src/shared/utils/logger';
import { TelegramAdminInventoryService } from '../services/telegram-admin-inventory.service';
import { formatDate } from '@src/shared/utils/date-utils';
import prisma from '@src/database/client';
import fs from 'fs';
import path from 'path';

const STATE_FILE = path.join(process.cwd(), 'logs', 'tiered-alert-state.json');

let lastCheckDate: string | null = null;

/**
 * Load persistent state from file
 */
function loadState() {
    try {
        if (fs.existsSync(STATE_FILE)) {
            const data = fs.readFileSync(STATE_FILE, 'utf8');
            const state = JSON.parse(data);
            lastCheckDate = state.lastCheckDate || null;
            logger.info('Loaded tiered alert scheduler state', { lastCheckDate });
        }
    } catch (error) {
        logger.error('Failed to load tiered alert scheduler state', { error });
    }
}

/**
 * Save persistent state to file
 */
function saveState(date: string) {
    try {
        const state = { lastCheckDate: date };
        if (!fs.existsSync(path.dirname(STATE_FILE))) {
            fs.mkdirSync(path.dirname(STATE_FILE), { recursive: true });
        }
        fs.writeFileSync(STATE_FILE, JSON.stringify(state), 'utf8');
    } catch (error) {
        logger.error('Failed to save tiered alert scheduler state', { error });
    }
}

/**
 * Scheduler for tiered stock expiry alerts (30 days, 7 days, 0 days)
 * Runs independent of daily sales reports.
 */
export async function startTelegramExpiryAlertScheduler() {
    logger.info('Telegram tiered expiry alert scheduler started');

    // Ensure state directory exists, then load persisted state on startup
    try { fs.mkdirSync(path.dirname(STATE_FILE), { recursive: true }); } catch (_) { /* ignore */ }
    loadState();

    // Check every hour
    setInterval(async () => {
        try {
            await runTieredExpiryCheck();
        } catch (error: any) {
            logger.error('Error in tiered expiry alert scheduler', {
                error: error.message,
            });
        }
    }, 60 * 60 * 1000); // 1 hour

    // Run once on startup
    await runTieredExpiryCheck();
}

async function runTieredExpiryCheck() {
    const now = new Date();
    const currentDate = formatDate(now);

    // Ensure we only run the tiered check once per day (since milestones are day-based)
    if (lastCheckDate === currentDate) {
        logger.debug('Tiered expiry check already conducted today', { date: currentDate });
        return;
    }

    logger.info('Running tiered stock expiry check', { date: currentDate });

    // Save state BEFORE sending — prevents duplicate alerts if the server
    // restarts mid-execution (next startup reads today's date from the file)
    lastCheckDate = currentDate;
    saveState(currentDate);

    // Fetch all active telegram configs to get the list of tenants to alert
    const configs = await prisma.telegramConfig.findMany({
        where: { isActive: true },
        include: { createdByUser: { select: { tenantId: true } } }
    });

    const tenantIds = Array.from(
        new Set(
            configs
                .map(c => c.createdByUser?.tenantId)
                .filter(t => t !== null && t !== undefined)
        )
    ) as number[];

    for (const tenantId of tenantIds) {
        try {
            await TelegramAdminInventoryService.sendNearExpiryAlert(tenantId);
            await TelegramAdminInventoryService.sendTieredExpiryAlerts(tenantId);
        } catch (error: any) {
            logger.error(`Failed to send expiry alerts for tenant ${tenantId}`, {
                error: error.message
            });
        }
    }
    logger.info('Tiered and near stock expiry check completed', { date: currentDate, tenantCount: tenantIds.length });
}
