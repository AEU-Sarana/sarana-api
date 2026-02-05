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