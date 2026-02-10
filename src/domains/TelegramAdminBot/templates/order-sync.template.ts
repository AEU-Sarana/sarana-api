import { formatDateTimeInTimezone } from '@src/shared/utils/date-utils';

type OrderSyncItem = {
  product_id: number;
  product_name?: string;
  quantity: number;
  unit_price: number;
  discount_amount?: number;
  subtotal: number;
};

type OrderSyncMessageInput = {
  order_uuid: string;
  receipt_number: string;
  order_date: Date;
  shift_id: number;
  seller_id: number;
  seller_name?: string | null;
  payment_method: string;
  total_amount: number;
  discount_amount?: number;
  tax_amount?: number;
  service_fee?: number;
  status: 'synced' | 'updated';
  order_id?: number;
  items: OrderSyncItem[];
  // Optional extra fields for richer UI
  received_amount?: number;
  change_amount?: number;
  start_time?: Date;
  end_time?: Date;
};

const formatMoney = (value?: number) => {
  const safeValue = typeof value === 'number' ? value : 0;
  return safeValue.toFixed(2);
};

export const buildOrderSyncMessage = (input: OrderSyncMessageInput): string => {
  const sellerText = input.seller_name
    ? `${input.seller_name} (ID: ${input.seller_id})`
    : `${input.seller_id}`;

  const itemsText = input.items
    .map((item) => {
      const name = item.product_name || `ទំនិញ ${item.product_id}`;
      return [
        `• ឈ្មោះទំនិញ: ${name}`,
        `• ចំនួននៃទំនិញ: ${item.quantity}`,
        `• តម្លៃរាយ: $${formatMoney(item.unit_price)}`,
        `• តម្លៃសរុប: $${formatMoney(item.subtotal)}`,
      ].join('\n');
    })
    .join('\n\n');

  const lines = [
    `*Sync នៃការកម្មង់*`,
    '',
    `📅 កាលបរិច្ឆេទ: ${formatDateTimeInTimezone(input.order_date, undefined, { hour12: true })}`,
    '',
    `🧾 *វិក្កយបត្រលក់ទំនិញ*`,
    `• លេខវិក្កយបត្រ: \`${input.receipt_number}\``,
    input.order_id ? `• លេខសម្គាល់កម្មង់: \`${input.order_id}\`` : null,
    '',
    `🛍️ *ព័ត៌មានទំនិញ*`,
    itemsText || '• (គ្មានទំនិញ)',
    '',
    `👤 *ព័ត៌មានអ្នកលក់*`,
    `• អ្នកលក់: ${sellerText}`,
    '',
    `💵 *ព័ត៌មានការទូទាត់*`,
    `• ការទូទាត់: ${input.payment_method === 'CASH' ? 'សាច់ប្រាក់' : input.payment_method}`,
    `• សេវាកម្ម: ${input.service_fee ? `$${formatMoney(input.service_fee)}` : ''}`,
    `• ពន្ធ: ${input.tax_amount ? `$${formatMoney(input.tax_amount)}` : ''}`,
    `• បញ្ចុះតម្លៃ: ${input.discount_amount ? `$${formatMoney(input.discount_amount)}` : ''}`,
    `• ចំនួនទឹកប្រាក់សរុប: *$${formatMoney(input.total_amount)}*`,
  ];

  return lines.filter((line) => line !== null).join('\n');
};
