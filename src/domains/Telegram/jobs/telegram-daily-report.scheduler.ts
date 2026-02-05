import prisma from '@src/database/client';
import { TelegramService } from '@src/domains/Telegram/services/telegram.service';
import { logger } from '@src/shared/utils/logger';
import { Role } from '@src/shared/config/permissions';

const DEFAULT_TIMEZONE = 'Asia/Phnom_Penh';
const DEFAULT_SEND_TIME = '23:30';
const TICK_INTERVAL_MS = 60_000;

let lastSentDate: string | null = null;
let isRunning = false;
let timer: NodeJS.Timeout | null = null;

function pad2(value: number): string {
  return value.toString().padStart(2, '0');
}

function formatTimeHHmm(date: Date): string {
  return `${pad2(date.getUTCHours())}:${pad2(date.getUTCMinutes())}`;
}

function getNowInTimezone(timeZone: string): { date: string; time: string } {
  const now = new Date();
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });

  const parts = formatter.formatToParts(now);
  const lookup = (type: string) => parts.find(part => part.type === type)?.value ?? '';
  const date = `${lookup('year')}-${lookup('month')}-${lookup('day')}`;
  const time = `${lookup('hour')}:${lookup('minute')}`;
  return { date, time };
}

async function resolveSenderUserId(fallbackUserId?: number): Promise<number> {
  if (fallbackUserId) return fallbackUserId;
  const admin = await prisma.user.findFirst({
    where: { role: Role.ADMIN },
    orderBy: { userId: 'asc' },
    select: { userId: true },
  });
  return admin?.userId ?? 0;
}

async function loadReportSettings() {
  const settings = await prisma.appSetting.findFirst({
    orderBy: { updatedAt: 'desc' },
    select: {
      reportSendEnabled: true,
      reportSendTime: true,
      reportSendTimezone: true,
      updatedBy: true,
    },
  });

  return {
    enabled: settings?.reportSendEnabled ?? true,
    time: settings?.reportSendTime ? formatTimeHHmm(settings.reportSendTime) : DEFAULT_SEND_TIME,
    timeZone: settings?.reportSendTimezone || DEFAULT_TIMEZONE,
    updatedBy: settings?.updatedBy,
  };
}

async function runOnce(): Promise<void> {
  if (isRunning) return;
  isRunning = true;

  try {
    const settings = await loadReportSettings();
    if (!settings.enabled) return;

    let now: { date: string; time: string };
    try {
      now = getNowInTimezone(settings.timeZone);
    } catch (error) {
      logger.warn('Invalid report timezone, using default', {
        timeZone: settings.timeZone,
      });
      now = getNowInTimezone(DEFAULT_TIMEZONE);
    }

    if (lastSentDate === now.date) return;
    if (now.time < settings.time) return;

    const senderUserId = await resolveSenderUserId(settings.updatedBy);
    await TelegramService.sendDailyAggregateReport(now.date, senderUserId);
    lastSentDate = now.date;

    logger.info('Telegram daily report sent', {
      date: now.date,
      time: now.time,
      timeZone: settings.timeZone,
    });
  } catch (error: any) {
    logger.error('Failed to send scheduled Telegram report', {
      error: error.message,
    });
  } finally {
    isRunning = false;
  }
}

export function startTelegramDailyReportScheduler(): void {
  if (timer) return;
  timer = setInterval(() => {
    void runOnce();
  }, TICK_INTERVAL_MS);

  void runOnce();
  logger.info('Telegram daily report scheduler started', {
    interval_ms: TICK_INTERVAL_MS,
  });
}
