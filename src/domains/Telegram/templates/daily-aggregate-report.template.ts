import { DailySalesReportResponse } from '@src/domains/Report/types/report.types';

const formatTime = (date: Date | string | null): string => {
  if (!date) return '-';
  const value = typeof date === 'string' ? new Date(date) : date;
  return value.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
};

export function buildDailyAggregateReportMessage(report: DailySalesReportResponse): string {
  const shiftsBreakdown = report.shifts_breakdown.length
    ? report.shifts_breakdown
        .map((s, index) => {
          const status = s.shift_count === 0 ? 'មិនធ្វើការ' : 'ធ្វើការ';
          return ` ${index + 1}) អ្នកលក់: ${s.seller_name}
    • ស្ថានភាព: ${status}
    • ចំនួនវេន: ${s.shift_count}
    • ការបញ្ជាទិញសរុប: ${s.total_orders}
    • ចំនួនទឹកប្រាក់សរុប: $${s.total_sales.toLocaleString()}
    • ម៉ោងចាប់ផ្តើម: ${formatTime(s.start_time)}
    • ម៉ោងបញ្ចប់: ${formatTime(s.end_time)}`;
        })
        .join('\n')
    : '';

  const lowStockItems = report.low_stock_items.length
    ? report.low_stock_items
        .map((item, index) => {
          return ` ${index + 1}) ${item.product_name} (${item.product_code})
    • ស្តុកបច្ចុប្បន្ន: ${item.current_stock}
    • ខ្ពស់បំផុតស្តុកទាប: ${item.low_stock_threshold}
    • ស្ថានភាព: ${item.status === 'out_of_stock' ? 'អស់ស្តុក' : 'ស្តុកទាប'}
    • កែប្រែចុងក្រោយ: ${item.last_updated}`;
        })
        .join('\n')
    : '';

  const topProducts = report.top_products.length
    ? report.top_products
        .map((p, index) => {
          return ` ${index + 1}) ${p.product_name} (${p.product_code})
    • បរិមាណលក់: ${p.quantity_sold}
    • ចំណូល: $${p.revenue.toLocaleString()}
    • តម្លៃមធ្យម: $${p.average_price.toFixed(2)}`;
        })
        .join('\n')
    : '';

  const summary = report.summary;
  const peakSalesHour = (summary as { peak_sales_hour?: string }).peak_sales_hour ?? '-';

  return `
📊 *របាយការណ៍លក់ប្រចាំថ្ងៃ*

📅 កាលបរិច្ឆេទ: ${report.date}

💰 *សេចក្តីសង្ខេបការលក់*
• ការបញ្ជាទិញសរុប៖ ${report.total_orders}
• ចំនួនទឹកប្រាក់សរុប៖ $${report.total_sales.toLocaleString()}
• មធ្យមភាគក្នុងការកម្មង់៖ $${report.average_order_value.toFixed(2)}

🧾 *សង្ខេបបន្ថែម*
• សរុបផលិតផលលក់: ${summary.total_products_sold}
• ចំនួនផលិតផលខុសគ្នាលក់: ${summary.unique_products_sold}
• មធ្យមភាគទំនិញក្នុងបញ្ជាទិញ: ${summary.average_items_per_order}
• ម៉ោងលក់កំពូល: ${peakSalesHour}
• សាច់ប្រាក់ប្រមូលបាន: $${summary.cash_collected.toLocaleString()}
• ខ្វះ/លើសសរុប: $${summary.short_over_amount.toLocaleString()}

${lowStockItems ? `⚠️ *ទំនិញស្តុកទាប*\n${lowStockItems}\n` : ''}${topProducts ? `🏆 *ផលិតផលលក់ដាច់*\n${topProducts}\n` : ''}${shiftsBreakdown ? `📌 *ស្ថិតិលក់តាមអ្នកលក់*\n${shiftsBreakdown}\n` : ''}
`.trim();
}
