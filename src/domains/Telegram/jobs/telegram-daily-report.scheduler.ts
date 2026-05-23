import prisma from '@src/database/client';
import { TelegramService } from '@src/domains/Telegram/services/telegram.service';
import { logger } from '@src/shared/utils/logger';
import { Role } from '@src/shared/config/permissions';
import { runTelegramAdminAlertsJob } from '@src/domains/TelegramAdminBot/jobs/telegram-admin-alert.job';
import fs from 'fs';
import path from 'path';

const DEFAULT_TIMEZONE = 'Asia/Phnom_Penh';
const DEFAULT_SEND_TIME = '23:30';
const TICK_INTERVAL_MS = 60_000;
const STATE_FILE = path.join(process.cwd(), 'logs', 'telegram-daily-report-state.json');

let lastSentDates: Record<string, string> = {};
let isRunning = false;
let timer: NodeJS.Timeout | null = null;

function loadState() {
  try {
    if (fs.existsSync(STATE_FILE)) {
      const data = fs.readFileSync(STATE_FILE, 'utf8');
      const state = JSON.parse(data);
      if (state?.lastSentDates && typeof state.lastSentDates === 'object') {
        lastSentDates = state.lastSentDates;
      } else if (state?.lastSentDate) {
        // Backward compatibility for old state format
        lastSentDates = { '1': state.lastSentDate };
      }
      logger.info('Loaded Telegram daily report scheduler state', { lastSentDates });
    }
  } catch (error) {
    logger.error('Failed to load Telegram daily report scheduler state', { error });
  }
}

function saveState() {
  try {
    const state = { lastSentDates };
    if (!fs.existsSync(path.dirname(STATE_FILE))) {
      fs.mkdirSync(path.dirname(STATE_FILE), { recursive: true });
    }
    fs.writeFileSync(STATE_FILE, JSON.stringify(state), 'utf8');
  } catch (error) {
    logger.error('Failed to save Telegram daily report scheduler state', { error });
  }
}

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
    hourCycle: 'h23',
  });

  const parts = formatter.formatToParts(now);
  const lookup = (type: string) => parts.find(part => part.type === type)?.value ?? '';
  const date = `${lookup('year')}-${lookup('month')}-${lookup('day')}`;
  const time = `${lookup('hour')}:${lookup('minute')}`;
  return { date, time };
}

async function resolveSenderUserIdForTenant(
  fallbackUserId?: number
): Promise<number | null> {
  if (fallbackUserId) {
    const user = await prisma.user.findFirst({
      where: { userId: fallbackUserId },
      select: { userId: true },
    });
    if (user) return user.userId;
  }

  const admin = await prisma.user.findFirst({
    where: { role: Role.ADMIN },
    orderBy: { userId: 'asc' },
    select: { userId: true },
  });
  return admin?.userId ?? null;
}

type ReportSetting = {
  tenantId: number;
  enabled: boolean;
  time: string;
  timeZone: string;
  updatedBy?: number | null;
};

async function loadReportSettings(): Promise<ReportSetting[]> {
  const settings = await prisma.appSetting.findMany({
    select: {
      reportSendEnabled: true,
      reportSendTime: true,
      reportSendTimezone: true,
      updatedBy: true,
    },
  });

  return settings.map((s) => ({
    tenantId: 1,
    enabled: s.reportSendEnabled ?? true,
    time: s.reportSendTime ? formatTimeHHmm(s.reportSendTime) : DEFAULT_SEND_TIME,
    timeZone: s.reportSendTimezone || DEFAULT_TIMEZONE,
    updatedBy: s.updatedBy,
  }));
}

async function runOnce(): Promise<void> {
  if (isRunning) return;
  isRunning = true;

  try {
    const settingsList = await loadReportSettings();
    if (settingsList.length === 0) return;

    for (const settings of settingsList) {
      if (!settings.enabled) continue;

      try {
        let now: { date: string; time: string };
        try {
          now = getNowInTimezone(settings.timeZone);
        } catch (error) {
          logger.warn('Invalid report timezone, using default', {
            timeZone: settings.timeZone,
            tenantId: settings.tenantId,
          });
          now = getNowInTimezone(DEFAULT_TIMEZONE);
        }

        const lastSentDate = lastSentDates[String(settings.tenantId)] ?? null;
        if (lastSentDate === now.date) continue;
        if (now.time < settings.time) continue;

        const senderUserId = await resolveSenderUserIdForTenant(
          settings.updatedBy ?? undefined
        );
        if (!senderUserId) {
          logger.warn('No admin user found for tenant, skipping report', {
            tenantId: settings.tenantId,
          });
          continue;
        }

        await TelegramService.sendDailyAggregateReport(
          now.date,
          senderUserId,
          settings.tenantId,
          true
        );

        // Save state AFTER successful send to avoid blocking retries on failure.
        lastSentDates[String(settings.tenantId)] = now.date;
        saveState();

        // Check for near-expiry stock alerts (Moved to independent scheduler)
        // await runTelegramAdminAlertsJob();

        logger.info('Telegram daily report sent', {
          tenantId: settings.tenantId,
          date: now.date,
          time: now.time,
          timeZone: settings.timeZone,
        });
      } catch (error: any) {
        logger.error('Failed to send scheduled Telegram report', {
          tenantId: settings.tenantId,
          error: error.message,
        });
      }
    }
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

  // Load persisted state on startup
  loadState();

  timer = setInterval(() => {
    void runOnce();
  }, TICK_INTERVAL_MS);

  logger.info('Telegram daily report scheduler started', {
    interval_ms: TICK_INTERVAL_MS,
  });
}
