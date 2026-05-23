import { logger } from '@src/shared/utils/logger';
import { TelegramAdminInventoryService } from '../services/telegram-admin-inventory.service';
import { formatDate } from '@src/shared/utils/date-utils';
import prisma from '@src/database/client';
import fs from 'fs';
import path from 'path';

const STATE_FILE = path.join(process.cwd(), 'logs', 'tiered-alert-state.json');

const DEFAULT_TIMEZONE = 'Asia/Phnom_Penh';
const TARGET_ALERT_TIME = '08:00'; // Target time to send alerts
const TICK_INTERVAL_MS = 60 * 1000; // Check every 1 minute for precision

let lastCheckDate: string | null = null;
let isRunning = false; // Prevent overlapping runs

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

    // Check every minute
    setInterval(async () => {
        try {
            await runTieredExpiryCheck();
        } catch (error: any) {
            logger.error('Error in tiered expiry alert scheduler', {
                error: error.message,
            });
        }
    }, TICK_INTERVAL_MS);

    // Run once on startup
    await runTieredExpiryCheck();
}

/**
 * Helper to get current time in specific timezone
 */
function getNowInTimezone(timeZone: string): { date: string; time: string } {
    const now = new Date();
    const formatter = new Intl.DateTimeFormat('en-CA', {
        timeZone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hourCycle: 'h23',
    });

    const parts = formatter.formatToParts(now);
    const lookup = (type: string) => parts.find(part => part.type === type)?.value ?? '';
    const date = `${lookup('year')}-${lookup('month')}-${lookup('day')}`;
    const time = `${lookup('hour')}:${lookup('minute')}`;
    return { date, time };
}

async function runTieredExpiryCheck() {
    if (isRunning) return;
    isRunning = true;

    try {
        const now = getNowInTimezone(DEFAULT_TIMEZONE);
        const currentDate = now.date;
        const currentTime = now.time;

        // Ensure we only run the tiered check once per day
        if (lastCheckDate === currentDate) {
            return;
        }

        // Only run at or after the target time
        if (currentTime < TARGET_ALERT_TIME) {
            return;
        }

        logger.info('Running tiered stock expiry check', { date: currentDate, time: currentTime });

        // Save state BEFORE sending — prevents duplicate alerts
        lastCheckDate = currentDate;
        saveState(currentDate);

        // Fetch all active telegram configs to check if bot integrations are active
        const configs = await prisma.telegramConfig.findMany({
            where: { isActive: true }
        });

        if (configs.length > 0) {
            try {
                await TelegramAdminInventoryService.sendNearExpiryAlert();
            } catch (error: any) {
                logger.error('Failed to send near expiry alerts', {
                    error: error.message
                });
            }
        }
        logger.info('Tiered and near stock expiry check completed', { date: currentDate });
    } finally {
        isRunning = false;
    }
}
