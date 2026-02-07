const DEFAULT_TIMEZONE =
  Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';

const isoUtcDateTimeRegex =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z$/;

const dateTimeFormatter = new Intl.DateTimeFormat('en-GB', {
  timeZone: DEFAULT_TIMEZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hour12: false,
});

export function formatToLocalDateTimeString(value: Date | string): string {
  const date = value instanceof Date ? value : new Date(value);
  const parts = dateTimeFormatter.formatToParts(date);

  const partMap: Record<string, string> = {};
  for (const part of parts) {
    partMap[part.type] = part.value;
  }

  return `${partMap.year}-${partMap.month}-${partMap.day} ${partMap.hour}:${partMap.minute}:${partMap.second}`;
}

function isUtcIsoDateTime(value: string): boolean {
  return isoUtcDateTimeRegex.test(value);
}

export function addLocalDateTimeFields<T>(data: T): T {
  if (data === null || data === undefined) {
    return data;
  }

  if (Array.isArray(data)) {
    return data.map((item) => addLocalDateTimeFields(item)) as T;
  }

  if (data instanceof Date) {
    return data;
  }

  if (typeof data !== 'object') {
    return data;
  }

  const result: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(data as Record<string, unknown>)) {
    const processedValue = addLocalDateTimeFields(value);
    result[key] = processedValue;

    if (key.endsWith('_local')) {
      continue;
    }

    if (value instanceof Date) {
      const localKey = `${key}_local`;
      if (!(localKey in result)) {
        result[localKey] = formatToLocalDateTimeString(value);
      }
      continue;
    }

    if (typeof value === 'string' && isUtcIsoDateTime(value)) {
      const localKey = `${key}_local`;
      if (!(localKey in result)) {
        result[localKey] = formatToLocalDateTimeString(value);
      }
    }
  }

  return result as T;
}
