import { DailySalesReportResponse } from '@src/domains/Report/types/report.types';
import { GetShiftResponse } from '@src/domains/Shift/types/shift.types';

const formatTime = (date: Date | null): string => {
  if (!date) return '-';
  return new Date(date).toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
};

const calculateDuration = (start: Date, end: Date | null): number => {
  if (!end) return 0;
  const diff = end.getTime() - start.getTime();
  return Math.round(diff / (1000 * 60 * 60));
};

const formatShortOver = (shift: GetShiftResponse): string => {
  const shortOver = (shift.actual_cash ?? 0) - (shift.expected_cash ?? 0);
  return shortOver >= 0 ? `+$${shortOver.toFixed(2)}` : `-$${Math.abs(shortOver).toFixed(2)}`;
};

export function buildDailyReportMessage(
  report: DailySalesReportResponse,
  shift: GetShiftResponse
): string {
  const shortOverText = formatShortOver(shift);

  // Using code blocks (```) for numbers makes them align perfectly on mobile
  return `
📊 *របាយការណ៍លក់ប្រចាំថ្ងៃ*

📅 *កាលបរិច្ឆេទ:* \`${report.date}\`
👤 *អ្នកលក់:* \`${shift.seller_name ?? '-'}\`

💰 *សេចក្តីសង្ខេបការលក់*
• ការបញ្ជាទិញសរុប៖  \`${report.total_orders}\`
• ចំនួនទឹកប្រាក់សរុប៖  \`$${report.total_sales.toLocaleString()}\`
• មធ្យមភាគក្នុងការកម្មង់៖ \`$${report.average_order_value.toFixed(2)}\`

💵 *ស្ថានភាពសាច់ប្រាក់*
• សាច់ប្រាក់បើកដំណើរ៖ \`$${shift.opening_cash.toFixed(2)}\`
• សាច់ប្រាក់រំពឹងទុក៖      \`$${(shift.expected_cash ?? 0).toFixed(2)}\`
• សាច់ប្រាក់ជាក់ស្តែង៖    \`$${(shift.actual_cash ?? 0).toFixed(2)}\`
• ខ្វះ/លើស៖      *${shortOverText}*

⏰ *ព័ត៌មានវេនការងារ*
• ម៉ោងចាប់ផ្តើម៖ \`${formatTime(shift.start_time)}\`  
• ម៉ោងបញ្ចប់៖  \`${formatTime(shift.end_time)}\`
• រយៈពេលសរុប៖ \`${calculateDuration(shift.start_time, shift.end_time)}\` ម៉ោង

`.trim();
}
