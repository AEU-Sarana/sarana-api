import { toPhnomPenhISOString, parseClientDateTime } from '@src/shared/utils/date-utils';

/**
 * Convert any Date found inside object/array into Phnom Penh ISO string.
 * Keeps the same keys. Does NOT add new keys.
 */
export function convertDatesToPhnomPenh<T>(input: T): T {
  return convertAny(input) as T;
}

function convertAny(value: any): any {
  if (value == null) return value;

  // Convert Date -> "YYYY-MM-DDTHH:mm:ss+07:00"
  if (value instanceof Date) {
    return toPhnomPenhISOString(value);
  }

  // If it's an ISO datetime string (with Z or timezone) or local-like string, try to parse
  if (typeof value === 'string') {
    const trimmed = value.trim();
    // stricter regex to avoid false positives like product codes
    // Matches YYYY-MM-DD or ISO 8601 patterns
    const datePattern = /^\d{4}-\d{2}-\d{2}(?:[ T]\d{2}:\d{2}(?::\d{2})?(?:\.\d{3})?(?:Z|[+-]\d{2}:?\d{2})?)?$/;

    if (trimmed.length >= 10 && datePattern.test(trimmed)) {
      try {
        // parseClientDateTime supports ISO with offset and local YYYY-MM-DD HH:mm formats
        const parsed = parseClientDateTime(trimmed);
        if (!isNaN(parsed.getTime())) {
          return toPhnomPenhISOString(parsed);
        }
      } catch (err) {
        // not a parseable datetime string, leave as-is
      }
    }
  }

  // Array
  if (Array.isArray(value)) {
    return value.map(convertAny);
  }

  // Plain object
  if (typeof value === 'object') {
    const out: any = {};
    for (const key of Object.keys(value)) {
      out[key] = convertAny(value[key]);
    }
    return out;
  }

  // primitive
  return value;
}
