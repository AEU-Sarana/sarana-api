"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.runBackupSchedulerOnce = runBackupSchedulerOnce;
exports.startBackupSchedulerJob = startBackupSchedulerJob;
exports.stopBackupSchedulerJob = stopBackupSchedulerJob;
const client_1 = __importDefault(require("../../../database/client"));
const backup_service_1 = require("../../../domains/Backup/services/backup.service");
const logger_1 = require("../../../shared/utils/logger");
const DEFAULT_TIMEZONE = process.env.BACKUP_TIMEZONE || 'Asia/Phnom_Penh';
const DEFAULT_SCHEDULE_TIME = process.env.BACKUP_SCHEDULE_TIME || '23:30';
const TICK_INTERVAL_MS = 60000;
let timer = null;
let isRunning = false;
let lastRunKey = null;
function formatTime(value, fallback) {
    if (!value)
        return fallback;
    const hours = value.getUTCHours().toString().padStart(2, '0');
    const minutes = value.getUTCMinutes().toString().padStart(2, '0');
    return `${hours}:${minutes}`;
}
function getNowInTimezone(timeZone) {
    const now = new Date();
    const formatter = new Intl.DateTimeFormat('en-CA', {
        timeZone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hourCycle: 'h23',
        weekday: 'short',
    });
    const parts = formatter.formatToParts(now);
    const lookup = (type) => parts.find((part) => part.type === type)?.value ?? '';
    const date = `${lookup('year')}-${lookup('month')}-${lookup('day')}`;
    const time = `${lookup('hour')}:${lookup('minute')}`;
    const weekday = lookup('weekday');
    const dayOfMonth = Number(lookup('day'));
    return { date, time, weekday, dayOfMonth };
}
async function loadBackupSettings() {
    const settings = await client_1.default.appSetting.findFirst({
        orderBy: { updatedAt: 'desc' },
        select: {
            autoBackup: true,
            backupFrequency: true,
            // backupScheduleTime removed
        },
    });
    return {
        enabled: settings?.autoBackup ?? true,
        frequency: (settings?.backupFrequency || 'daily'),
        scheduleTime: DEFAULT_SCHEDULE_TIME,
    };
}
function getRunKey(now, frequency) {
    if (frequency === 'daily') {
        return `daily:${now.date}`;
    }
    if (frequency === 'weekly') {
        return `weekly:${now.date}`;
    }
    return `monthly:${now.date.slice(0, 7)}`;
}
function shouldRunNow(now, frequency, scheduleTime) {
    if (now.time < scheduleTime) {
        return false;
    }
    if (frequency === 'daily') {
        return true;
    }
    if (frequency === 'weekly') {
        return now.weekday === 'Mon';
    }
    return now.dayOfMonth === 1;
}
async function runBackupSchedulerOnce() {
    if (isRunning)
        return;
    isRunning = true;
    try {
        const settings = await loadBackupSettings();
        if (!settings.enabled)
            return;
        const now = getNowInTimezone(DEFAULT_TIMEZONE);
        if (!shouldRunNow(now, settings.frequency, settings.scheduleTime))
            return;
        const runKey = getRunKey(now, settings.frequency);
        if (lastRunKey === runKey)
            return;
        await backup_service_1.BackupService.createBackup({
            backup_name: `backup_${now.date}_${settings.frequency}`,
            include_data: true,
            triggered_by: 'auto',
        });
        lastRunKey = runKey;
        logger_1.logger.info('Backup scheduler completed run', {
            frequency: settings.frequency,
            runKey,
            scheduleTime: settings.scheduleTime,
            timezone: DEFAULT_TIMEZONE,
        });
    }
    catch (error) {
        logger_1.logger.error('Backup scheduler run failed', { error: error.message });
    }
    finally {
        isRunning = false;
    }
}
function startBackupSchedulerJob() {
    if (timer)
        return;
    timer = setInterval(() => {
        void runBackupSchedulerOnce();
    }, TICK_INTERVAL_MS);
    logger_1.logger.info('Backup scheduler started', {
        intervalMs: TICK_INTERVAL_MS,
        scheduleTime: DEFAULT_SCHEDULE_TIME,
        timezone: DEFAULT_TIMEZONE,
    });
}
function stopBackupSchedulerJob() {
    if (!timer)
        return;
    clearInterval(timer);
    timer = null;
    logger_1.logger.info('Backup scheduler stopped');
}
//# sourceMappingURL=backup-scheduler.job.js.map