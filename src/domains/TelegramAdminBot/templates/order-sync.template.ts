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
  const sellerLine = input.seller_name
    ? `${input.seller_name} (ID ${input.seller_id})`
    : `ID ${input.seller_id}`;

  const itemsText = input.items
    .map((item) => {
      const name = item.product_name || `Product ${item.product_id}`;
      return `- ${name} | qty ${item.quantity} | price ${formatMoney(item.unit_price)} | subtotal ${formatMoney(item.subtotal)}`;
    })
    .join('\n');

  return [
    `Order Sync ${input.status.toUpperCase()}`,
    `Receipt: ${input.receipt_number}`,
    `Order UUID: ${input.order_uuid}`,
    input.order_id ? `Order ID: ${input.order_id}` : null,
    `Date: ${formatDateTimeInTimezone(input.order_date, undefined, { hour12: true })}`,
    `Shift ID: ${input.shift_id}`,
    `Seller: ${sellerLine}`,
    `Payment: ${input.payment_method}`,
    `Discount: ${formatMoney(input.discount_amount)}`,
    `Tax: ${formatMoney(input.tax_amount)}`,
    `Service Fee: ${formatMoney(input.service_fee)}`,
    `Total: ${formatMoney(input.total_amount)}`,
    `Items:`,
    itemsText || '- (no items)',
  ]
    .filter(Boolean)
    .join('\n');
};
