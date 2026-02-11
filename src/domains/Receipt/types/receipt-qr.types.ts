export interface ReceiptQrItem {
  product_name: string;
  qty: number;
  subtotal: number;
}

export interface ReceiptQrPayload {
  receipt_code: string;
  receipt_number: string;
  order_date: string;
  items: ReceiptQrItem[];
  total_amount: number;
  tax_amount?: number;
  discount_amount?: number;
  service_fee?: number;
  store_name?: string;
  phone?: string;
  address?: string;
  footer_note?: string;
}

export interface ReceiptQrEnvelope {
  payload: ReceiptQrPayload;
  signature: string;
}
