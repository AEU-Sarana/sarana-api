export interface GetShiftResponse {
  shift_id: number;
  seller_name?: string | null;
  shift_date: string;
  start_time: Date | string;
  end_time?: Date | string | null;
  opening_cash?: number | null;
  actual_cash?: number | null;
  expected_cash?: number | null;
  total_sales_amount?: number | null;
  total_sales_count: number;
  short_amount?: number | null;
  over_amount?: number | null;
  exchange_rate?: number | null;
}
import { formatDateTimeInTimezone } from '@src/shared/utils/date-utils';
import { APP_CONSTANTS } from '@src/shared/config/constants';

const TELEGRAM_TIMEZONE = APP_CONSTANTS.TIMEZONE;

const TIME_PORTION_REGEX = /^\d{4}-\d{2}-\d{2} (\d{2}):(\d{2}):\d{2} (AM|PM)$/;

const formatTime = (date: Date | string | null): string => {
  if (!date) return '-';
  const formatted = formatDateTimeInTimezone(date, TELEGRAM_TIMEZONE, { hour12: true });
  const match = TIME_PORTION_REGEX.exec(formatted);
  return match ? `${match[1]}:${match[2]} ${match[3]}` : formatted;
};

const calculateDuration = (start: Date | string, end: Date | string | null): number => {
  if (!end) return 0;
  const startDate = new Date(start);
  const endDate = new Date(end);
  const diff = endDate.getTime() - startDate.getTime();
  return Math.round(diff / (1000 * 60 * 60));
};

const formatShortOver = (shift: GetShiftResponse): string => {
  const short = shift.short_amount ?? 0;
  const over = shift.over_amount ?? 0;
  const rate = shift.exchange_rate ?? 4000;

  if (over > 0) return `លើស $${over.toFixed(2)} (${(over * rate).toLocaleString()}៛)`;
  if (short > 0) return `ខ្វះ -$${short.toFixed(2)} (-${(short * rate).toLocaleString()}៛)`;
  return '$0.00';
};

export function buildDailyReportMessage(
  shift: GetShiftResponse
): string {
  const shortOverText = formatShortOver(shift);
  const totalSales = shift.total_sales_amount ?? 0;
  const openingCash = shift.opening_cash ?? 0;
  const expectedCash = shift.expected_cash ?? (openingCash + totalSales);

  const average_order_value = shift.total_sales_count > 0
    ? totalSales / shift.total_sales_count
    : 0;

  const rate = shift.exchange_rate ?? 4000;

  return `
📊 *របាយការណ៍លក់ប្រចាំវេន*

📅 កាលបរិច្ឆេទ: ${shift.shift_date}
👤 អ្នកលក់: ${shift.seller_name ?? '-'}

💰 *សេចក្តីសង្ខេបការលក់*
• ការបញ្ជាទិញសរុប៖ ${shift.total_sales_count}
• ចំនួនទឹកប្រាក់សរុប៖ $${totalSales.toLocaleString()} (${(totalSales * rate).toLocaleString()}៛)
• មធ្យមភាគក្នុងការកម្មង់៖ $${average_order_value.toFixed(2)} (${(average_order_value * rate).toLocaleString()}៛)

💵 *ស្ថានភាពសាច់ប្រាក់*
• សាច់ប្រាក់បើកដំណើរ៖ $${openingCash.toFixed(2)} (${(openingCash * rate).toLocaleString()}៛)
• សរុបទឹកប្រាក់លក់៖ $${totalSales.toFixed(2)} (${(totalSales * rate).toLocaleString()}៛)
• សាច់ប្រាក់រំពឹងទុក៖ $${expectedCash.toFixed(2)} (${(expectedCash * rate).toLocaleString()}៛)
• សាច់ប្រាក់ជាក់ស្តែង៖ $${(shift.actual_cash ?? 0).toFixed(2)} (${((shift.actual_cash ?? 0) * rate).toLocaleString()}៛)
• ខ្វះ/លើស៖ ${shortOverText}

⏰ *ព័ត៌មានវេនការងារ*
• ម៉ោងចាប់ផ្តើម៖ ${formatTime(shift.start_time)}
• ម៉ោងបញ្ចប់៖ ${formatTime(shift.end_time ?? null)}
• រយៈពេលសរុប៖ ${calculateDuration(
    shift.start_time,
    shift.end_time ?? null
  )} ម៉ោង
• អត្រាប្តូរប្រាក់៖ 1$ = ${rate.toLocaleString()}៛
`.trim();
}
