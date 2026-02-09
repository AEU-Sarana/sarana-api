export interface SyncOrdersRequest {
    orders: Array<{
      order_uuid: string;
      receipt_number: string;
      shift_id: number;
      seller_id?: number;
      order_date: string; // ISO8601
      total_amount: number;
      discount_amount?: number;
      tax_amount?: number;
      service_fee?: number;
      payment_method: 'CASH';
      items: Array<{
        product_id: number;
        product_name?: string;
        quantity: number;
        unit_price: number;
        discount_amount?: number;
        subtotal: number;
      }>;
    }>;
  }
  
  export interface SyncOrdersResponse {
    synced: number;
    updated: number;
    failed: number;
    orders: Array<{
      order_uuid: string;
      order_id: number | null;
      status: 'synced' | 'updated' | 'failed';
      error?: string;
    }>;
  }
  
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
    order_uuid: string;
    receipt_number: string;
    shift_id: number;
    seller_id: number;
    seller_name: string | null;
    order_date: Date;
    total_amount: number;
    discount_amount: number;
    tax_amount: number;
    service_fee: number;
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
  
  export interface GetSyncStatusRequest {
    order_uuids: string[];
  }
  
  export interface GetSyncStatusResponse {
    statuses: Array<{
      order_uuid: string;
      synced: boolean;
      order_id: number | null;
    }>;
  }