import { format, parseISO, startOfDay, endOfDay, addDays, subDays } from 'date-fns';
import { APP_CONSTANTS } from '@src/shared/config/constants';

/**
 * Phnom Penh timezone (UTC+7)
 * @deprecated Use APP_CONSTANTS.TIMEZONE instead
 */
export const PHNOM_PENH_TIMEZONE = APP_CONSTANTS.TIMEZONE;

/**
 * Format date to string in Phnom Penh timezone
 */
export function formatDateInPhnomPenh(date: Date | string, formatStr: string = 'yyyy-MM-dd HH:mm:ss'): string {
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  
  // Convert to Phnom Penh timezone
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: APP_CONSTANTS.TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });

  const parts = formatter.formatToParts(dateObj);
  const year = parts.find(p => p.type === 'year')?.value;
  const month = parts.find(p => p.type === 'month')?.value;
  const day = parts.find(p => p.type === 'day')?.value;
  const hour = parts.find(p => p.type === 'hour')?.value;
  const minute = parts.find(p => p.type === 'minute')?.value;
  const second = parts.find(p => p.type === 'second')?.value;

  // Format according to formatStr
  return formatStr
    .replace('yyyy', year || '')
    .replace('MM', month || '')
    .replace('dd', day || '')
    .replace('HH', hour || '')
    .replace('mm', minute || '')
    .replace('ss', second || '');
}

/**
 * Convert date to Phnom Penh timezone ISO string
*/
export function toPhnomPenhISOString(date: Date | string): string {
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  
  // Get the date components in Phnom Penh timezone
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: APP_CONSTANTS.TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });

  const parts = formatter.formatToParts(dateObj);
  const year = parts.find(p => p.type === 'year')?.value;
  const month = parts.find(p => p.type === 'month')?.value;
  const day = parts.find(p => p.type === 'day')?.value;
  const hour = parts.find(p => p.type === 'hour')?.value;
  const minute = parts.find(p => p.type === 'minute')?.value;
  const second = parts.find(p => p.type === 'second')?.value;

  // Return ISO format string with Phnom Penh timezone offset
  return `${year}-${month}-${day}T${hour}:${minute}:${second}+07:00`;
}

/**
 * Format date to string
 */
export function formatDate(date: Date | string, formatStr: string = 'yyyy-MM-dd'): string {
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  return format(dateObj, formatStr);
}

/**
 * Get start of day
 */
export function getStartOfDay(date: Date = new Date()): Date {
  return startOfDay(date);
}

/**
 * Get end of day
 */
export function getEndOfDay(date: Date = new Date()): Date {
  return endOfDay(date);
}

/**
 * Get date range (start and end of day)
 */
export function getDateRange(date: Date = new Date()): { start: Date; end: Date } {
  return {
    start: getStartOfDay(date),
    end: getEndOfDay(date),
  };
}

/**
 * Add days to date
 */
export function addDaysToDate(date: Date, days: number): Date {
  return addDays(date, days);
}

/**
 * Subtract days from date
 */
export function subtractDaysFromDate(date: Date, days: number): Date {
  return subDays(date, days);
}

/**
 * Check if date is today
 */
export function isToday(date: Date | string): boolean {
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  const today = new Date();
  return formatDate(dateObj) === formatDate(today);
}

const TIMEZONE_OFFSET_HOURS: Record<string, number> = {
  'Asia/Phnom_Penh': 7,
};

const TIMEZONE_AWARE_ISO_REGEX = /(Z|[+-]\d{2}:\d{2})$/i;
const LOCAL_DATETIME_REGEX =
  /^(\d{4})-(\d{2})-(\d{2})(?:[ T])(\d{2}):(\d{2})(?::(\d{2}))?(?:\.(\d{1,3}))?$/;

export function parseClientDateTime(
  value: string,
  timezone: string = APP_CONSTANTS.TIMEZONE
): Date {
  const input = value.trim();
  if (!input) {
    throw new Error('Date value is required');
  }

  if (TIMEZONE_AWARE_ISO_REGEX.test(input)) {
    const parsed = new Date(input);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed;
    }
  }

  const localMatch = LOCAL_DATETIME_REGEX.exec(input);
  if (localMatch) {
    const tzOffsetHours = TIMEZONE_OFFSET_HOURS[timezone];
    if (tzOffsetHours === undefined) {
      throw new Error(`Unsupported timezone: ${timezone}`);
    }

    const year = Number(localMatch[1]);
    const month = Number(localMatch[2]);
    const day = Number(localMatch[3]);
    const hour = Number(localMatch[4]);
    const minute = Number(localMatch[5]);
    const second = localMatch[6] ? Number(localMatch[6]) : 0;
    const millisecond = localMatch[7] ? Number(localMatch[7].padEnd(3, '0')) : 0;

    return new Date(
      Date.UTC(year, month - 1, day, hour - tzOffsetHours, minute, second, millisecond)
    );
  }

  const fallback = new Date(input);
  if (!Number.isNaN(fallback.getTime())) {
    return fallback;
  }

  throw new Error(
    `Invalid datetime format: "${value}". Expected ISO8601 or YYYY-MM-DD HH:mm[:ss][.SSS].`
  );
}

export function formatDateTimeInTimezone(
  value: Date | string,
  timezone: string = APP_CONSTANTS.TIMEZONE,
  options?: { hour12?: boolean }
): string {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new Error('Invalid Date provided for formatting');
  }
  const hour12 = options?.hour12 ?? false;

  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12,
  }).formatToParts(date);

  const partMap = new Map(parts.map((part) => [part.type, part.value]));
  const year = partMap.get('year');
  const month = partMap.get('month');
  const day = partMap.get('day');
  const hour = partMap.get('hour');
  const minute = partMap.get('minute');
  const second = partMap.get('second');
  const dayPeriod = partMap.get('dayPeriod');

  if (!year || !month || !day || !hour || !minute || !second) {
    return date.toISOString();
  }

  if (hour12) {
    if (!dayPeriod) {
      return date.toISOString();
    }
    return `${year}-${month}-${day} ${hour}:${minute}:${second} ${dayPeriod}`;
  }

  return `${year}-${month}-${day} ${hour}:${minute}:${second}`;
}
