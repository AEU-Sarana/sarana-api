import prisma from '@src/database/client';
import { BackupService } from '@src/domains/Backup/services/backup.service';
import { logger } from '@src/shared/utils/logger';

const DEFAULT_TIMEZONE = process.env.BACKUP_TIMEZONE || 'Asia/Phnom_Penh';
const DEFAULT_SCHEDULE_TIME = process.env.BACKUP_SCHEDULE_TIME || '23:30';
const TICK_INTERVAL_MS = 60_000;

let timer: NodeJS.Timeout | null = null;
let isRunning = false;
let lastRunKey: string | null = null;

type BackupFrequency = 'daily' | 'weekly' | 'monthly';

function formatTime(value: Date | null | undefined, fallback: string): string {
  if (!value) return fallback;
  const hours = value.getUTCHours().toString().padStart(2, '0');
  const minutes = value.getUTCMinutes().toString().padStart(2, '0');
  return `${hours}:${minutes}`;
}

function getNowInTimezone(timeZone: string): {
  date: string;
  time: string;
  weekday: string;
  dayOfMonth: number;
} {
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
  const lookup = (type: string) => parts.find((part) => part.type === type)?.value ?? '';

  const date = `${lookup('year')}-${lookup('month')}-${lookup('day')}`;
  const time = `${lookup('hour')}:${lookup('minute')}`;
  const weekday = lookup('weekday');
  const dayOfMonth = Number(lookup('day'));

  return { date, time, weekday, dayOfMonth };
}

async function loadBackupSettings(): Promise<{
  enabled: boolean;
  frequency: BackupFrequency;
  scheduleTime: string;
}> {
  const settings = await prisma.appSetting.findFirst({
    orderBy: { updatedAt: 'desc' },
    select: {
      autoBackup: true,
      backupFrequency: true,
      backupScheduleTime: true,
    },
  });

  return {
    enabled: settings?.autoBackup ?? true,
    frequency: (settings?.backupFrequency || 'daily') as BackupFrequency,
    scheduleTime: formatTime(settings?.backupScheduleTime, DEFAULT_SCHEDULE_TIME),
  };
}

function getRunKey(now: { date: string }, frequency: BackupFrequency): string {
  if (frequency === 'daily') {
    return `daily:${now.date}`;
  }

  if (frequency === 'weekly') {
    return `weekly:${now.date}`;
  }

  return `monthly:${now.date.slice(0, 7)}`;
}

function shouldRunNow(
  now: { time: string; weekday: string; dayOfMonth: number },
  frequency: BackupFrequency,
  scheduleTime: string
): boolean {
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

export async function runBackupSchedulerOnce(): Promise<void> {
  if (isRunning) return;
  isRunning = true;

  try {
    const settings = await loadBackupSettings();
    if (!settings.enabled) return;

    const now = getNowInTimezone(DEFAULT_TIMEZONE);
    if (!shouldRunNow(now, settings.frequency, settings.scheduleTime)) return;

    const runKey = getRunKey(now, settings.frequency);
    if (lastRunKey === runKey) return;

    await BackupService.createBackup({
      backup_name: `backup_${now.date}_${settings.frequency}`,
      include_data: true,
      triggered_by: 'auto',
    });

    lastRunKey = runKey;
    logger.info('Backup scheduler completed run', {
      frequency: settings.frequency,
      runKey,
      scheduleTime: settings.scheduleTime,
      timezone: DEFAULT_TIMEZONE,
    });
  } catch (error: any) {
    logger.error('Backup scheduler run failed', { error: error.message });
  } finally {
    isRunning = false;
  }
}

export function startBackupSchedulerJob(): void {
  if (timer) return;
  timer = setInterval(() => {
    void runBackupSchedulerOnce();
  }, TICK_INTERVAL_MS);

  logger.info('Backup scheduler started', {
    intervalMs: TICK_INTERVAL_MS,
    scheduleTime: DEFAULT_SCHEDULE_TIME,
    timezone: DEFAULT_TIMEZONE,
  });
}

export function stopBackupSchedulerJob(): void {
  if (!timer) return;
  clearInterval(timer);
  timer = null;
  logger.info('Backup scheduler stopped');
}
