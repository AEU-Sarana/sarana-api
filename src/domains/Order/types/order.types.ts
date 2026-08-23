export interface ListOrdersRequest {
  page?: number;
  limit?: number;
  shift_id?: number;
  seller_id?: number;
  start_date?: string;
  end_date?: string;
}

export interface OrderResponse {
  order_id: number;
  receipt_number: string;
  shift_id: number | null;
  seller_id: number;
  seller_name: string | null;
  customer_id?: number | null;
  customer_name?: string | null;
  paid_amount?: number;
  balance_due?: number;
  payment_status?: string;
  payment_due_date?: Date | null;
  order_date: Date;
  total_amount: number;
  discount_amount: number;
  tax_amount: number;
  service_fee: number;
  exchange_rate: number;
  payment_method: string;
  has_receipt_link: boolean;
  receipt_link_status: string | null;
  created_at: Date;
}

export interface ListOrdersResponse {
  orders: OrderResponse[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface GetOrderResponse extends OrderResponse {
  received_amount: number;
  items: Array<{
    order_item_id: number;
    product_id: number;
    product_name: string | null;
    quantity: number;
    unit_price: number;
    discount_amount: number;
    subtotal: number;
  }>;
}

export interface CreateOrderRequest {
  payment_method: string;
  customer_id?: number;
  payment_type?: 'PAID' | 'DEBT' | 'PARTIAL';
  initial_paid_amount?: number;
  payment_due_date?: string;
  received_amount?: number;
  discount_amount?: number;
  tax_amount?: number;
  service_fee?: number;
  items: Array<{
    product_id: number;
    quantity: number;
    unit_price: number;
    discount_amount?: number;
    subtotal: number;
  }>;
}

export type CreateOrderResponse = GetOrderResponse;
