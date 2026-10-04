"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PHNOM_PENH_TIMEZONE = void 0;
exports.formatDateInPhnomPenh = formatDateInPhnomPenh;
exports.toISOStringWithTimezone = toISOStringWithTimezone;
exports.toPhnomPenhISOString = toPhnomPenhISOString;
exports.formatDate = formatDate;
exports.getStartOfDay = getStartOfDay;
exports.getEndOfDay = getEndOfDay;
exports.getDateRange = getDateRange;
exports.addDaysToDate = addDaysToDate;
exports.subtractDaysFromDate = subtractDaysFromDate;
exports.isToday = isToday;
exports.parseClientDateTime = parseClientDateTime;
exports.formatDateTimeInTimezone = formatDateTimeInTimezone;
const date_fns_1 = require("date-fns");
const constants_1 = require("../../shared/config/constants");
/**
 * Phnom Penh timezone (UTC+7)
 * @deprecated Use APP_CONSTANTS.TIMEZONE instead
 */
exports.PHNOM_PENH_TIMEZONE = constants_1.APP_CONSTANTS.TIMEZONE;
/**
 * Format date to string in Phnom Penh timezone
 */
function formatDateInPhnomPenh(date, formatStr = 'yyyy-MM-dd HH:mm:ss') {
    const dateObj = typeof date === 'string' ? (0, date_fns_1.parseISO)(date) : date;
    // Convert to Phnom Penh timezone
    const formatter = new Intl.DateTimeFormat('en-US', {
        timeZone: constants_1.APP_CONSTANTS.TIMEZONE,
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
 * Convert date to ISO string in specified timezone
*/
function toISOStringWithTimezone(date, timezone = constants_1.APP_CONSTANTS.TIMEZONE) {
    const dateObj = typeof date === 'string' ? (0, date_fns_1.parseISO)(date) : date;
    const formatter = new Intl.DateTimeFormat('en-CA', {
        timeZone: timezone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
    });
    const parts = formatter.formatToParts(dateObj);
    const partMap = new Map(parts.map(p => [p.type, p.value]));
    const year = partMap.get('year');
    const month = partMap.get('month');
    const day = partMap.get('day');
    const hour = partMap.get('hour');
    const minute = partMap.get('minute');
    const second = partMap.get('second');
    // To get the offset, we can use the difference between the formatted date and the UTC date
    // but a simpler way for fixed offsets is to just use the formatter or a manual map for common ones.
    // For now, since we only really support Asia/Phnom_Penh (+07:00), we can keep it simple or implement a helper.
    let offset = '+00:00';
    if (timezone === 'Asia/Phnom_Penh') {
        offset = '+07:00';
    }
    else {
        // Basic dynamic offset calculation for other timezones
        const tzDate = new Date(dateObj.toLocaleString('en-US', { timeZone: timezone }));
        const utcDate = new Date(dateObj.toLocaleString('en-US', { timeZone: 'UTC' }));
        const diffMinutes = Math.round((tzDate.getTime() - utcDate.getTime()) / 60000);
        const absMinutes = Math.abs(diffMinutes);
        const hours = Math.floor(absMinutes / 60).toString().padStart(2, '0');
        const minutes = (absMinutes % 60).toString().padStart(2, '0');
        offset = (diffMinutes >= 0 ? '+' : '-') + hours + ':' + minutes;
    }
    return `${year}-${month}-${day}T${hour}:${minute}:${second}${offset}`;
}
/**
 * Convert date to Phnom Penh timezone ISO string
 * @deprecated Use toISOStringWithTimezone instead
*/
function toPhnomPenhISOString(date) {
    return toISOStringWithTimezone(date, 'Asia/Phnom_Penh');
}
/**
 * Format date to string
 */
function formatDate(date, formatStr = 'yyyy-MM-dd') {
    const dateObj = typeof date === 'string' ? (0, date_fns_1.parseISO)(date) : date;
    return (0, date_fns_1.format)(dateObj, formatStr);
}
/**
 * Get start of day
 */
function getStartOfDay(date = new Date()) {
    return (0, date_fns_1.startOfDay)(date);
}
/**
 * Get end of day
 */
function getEndOfDay(date = new Date()) {
    return (0, date_fns_1.endOfDay)(date);
}
/**
 * Get date range (start and end of day)
 */
function getDateRange(date = new Date()) {
    return {
        start: getStartOfDay(date),
        end: getEndOfDay(date),
    };
}
/**
 * Add days to date
 */
function addDaysToDate(date, days) {
    return (0, date_fns_1.addDays)(date, days);
}
/**
 * Subtract days from date
 */
function subtractDaysFromDate(date, days) {
    return (0, date_fns_1.subDays)(date, days);
}
/**
 * Check if date is today
 */
function isToday(date) {
    const dateObj = typeof date === 'string' ? (0, date_fns_1.parseISO)(date) : date;
    const today = new Date();
    return formatDate(dateObj) === formatDate(today);
}
const TIMEZONE_AWARE_ISO_REGEX = /(Z|[+-]\d{2}:\d{2})$/i;
const LOCAL_DATETIME_REGEX = /^(\d{4})-(\d{2})-(\d{2})(?:[ T])(\d{2}):(\d{2})(?::(\d{2}))?(?:\.(\d{1,3}))?$/;
/**
 * Get offset in minutes for a timezone at a specific date
 */
function getTimezoneOffsetMinutes(timezone, date = new Date()) {
    const tzDate = new Date(date.toLocaleString('en-US', { timeZone: timezone }));
    const utcDate = new Date(date.toLocaleString('en-US', { timeZone: 'UTC' }));
    return Math.round((tzDate.getTime() - utcDate.getTime()) / 60000);
}
function parseClientDateTime(value, timezone = constants_1.APP_CONSTANTS.TIMEZONE) {
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
        const tzOffsetMinutes = getTimezoneOffsetMinutes(timezone);
        const year = Number(localMatch[1]);
        const month = Number(localMatch[2]);
        const day = Number(localMatch[3]);
        const hour = Number(localMatch[4]);
        const minute = Number(localMatch[5]);
        const second = localMatch[6] ? Number(localMatch[6]) : 0;
        const millisecond = localMatch[7] ? Number(localMatch[7].padEnd(3, '0')) : 0;
        // Adjusted logic to use offset in minutes
        return new Date(Date.UTC(year, month - 1, day, hour, minute - tzOffsetMinutes, second, millisecond));
    }
    const fallback = new Date(input);
    if (!Number.isNaN(fallback.getTime())) {
        return fallback;
    }
    throw new Error(`Invalid datetime format: "${value}". Expected ISO8601 or YYYY-MM-DD HH:mm[:ss][.SSS].`);
}
function formatDateTimeInTimezone(value, timezone = constants_1.APP_CONSTANTS.TIMEZONE, options) {
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
//# sourceMappingURL=date-utils.js.map