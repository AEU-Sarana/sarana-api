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
};

const formatMoney = (value?: number) => {
  const safeValue = typeof value === 'number' ? value : 0;
  return safeValue.toFixed(2);
};

export const buildOrderSyncMessage = (input: OrderSyncMessageInput): string => {
  const statusEmoji = input.status === 'synced' ? '✅' : '🔄';
  const sellerLine = input.seller_name
    ? `${input.seller_name} (ID: \`${input.seller_id}\`)`
    : `ID: \`${input.seller_id}\``;

  const itemsText = input.items
    .map((item) => {
      const name = item.product_name || `Product ${item.product_id}`;
      return `🔹 *${name}*\n    └ ${item.quantity} x $${formatMoney(item.unit_price)} = *$${formatMoney(item.subtotal)}*`;
    })
    .join('\n');

  const lines = [
    `${statusEmoji} *ORDER SYNC ${input.status.toUpperCase()}*`,
    `━━━━━━━━━━━━━━━━━━━━`,
    `📄 *Receipt:* \`${input.receipt_number}\``,
    input.order_id ? `🆔 *Order ID:* \`${input.order_id}\`` : null,
    `📅 *Date:* ${formatDateTimeInTimezone(input.order_date, undefined, { hour12: true })}`,
    `👤 *Seller:* ${sellerLine}`,
    `🏢 *Shift ID:* \`${input.shift_id}\``,
    `━━━━━━━━━━━━━━━━━━━━`,
    `🛍️ *Items:*`,
    itemsText || '  - (no items)',
    `━━━━━━━━━━━━━━━━━━━━`,
    `💳 *Payment:* ${input.payment_method.toUpperCase()}`,
    input.discount_amount ? `🏷️ *Discount:* -$${formatMoney(input.discount_amount)}` : null,
    input.service_fee ? `⚙️ *Fee:* $${formatMoney(input.service_fee)}` : null,
    input.tax_amount ? `🏦 *Tax:* $${formatMoney(input.tax_amount)}` : null,
    `💰 *TOTAL:* *$${formatMoney(input.total_amount)}*`,
    `━━━━━━━━━━━━━━━━━━━━`,
    `🗝️ \`${input.order_uuid}\``,
  ];

  return lines.filter(Boolean).join('\n');
};
