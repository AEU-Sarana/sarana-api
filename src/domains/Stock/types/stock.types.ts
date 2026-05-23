import { StockMovementType } from '../enums/stock-movement-type.enum';
import { ProductStatus } from '@src/domains/Product/enums/product-status.enum';

export interface GetStockRequest {
  product_id?: number;
  version?: number;
  status?: 'in_stock' | 'low_stock' | 'out_of_stock' | 'negative';
  category?: string;
  category_id?: number;
  search?: string;
  barcode?: string;
  page?: number;
  limit?: number;
  product_status?: ProductStatus;
}

export interface StockResponse {
  stock_id: number;
  product_id: number;
  quantity: number;
  stock_version: number;
  last_sync_time?: Date | null;
  updated_at: Date;
  product?: {
    product_id: number;
    product_name: string;
    product_code: string;
  };
}

export interface StockListResponse {
  stock_id: number;
  product_id: number;
  product_code: string;
  product_name: string;
  category: string | null;
  quantity: number;
  low_stock_threshold: number | null;
  stock_version: number;
  status: 'in_stock' | 'low_stock' | 'out_of_stock' | 'negative';
  last_sync_time: Date | null;
  product_status: ProductStatus;
  has_expiry: boolean;
  expired_at?: Date | null;
  updated_at: Date;
}

export interface StockSummary {
  total_products: number;
  total_stock_quantity: number;
  low_stock_count: number;
  out_of_stock_count: number;
  negative_stock_count: number;
}

// Single stock response (when product_id is provided) - flattened format
export interface GetStockByProductResponse {
  stock_id: number;
  product_id: number;
  product_code: string;
  product_name: string;
  has_expiry: boolean;
  image_path: string | null;
  barcode: string;
  category: string | null;
  quantity: number;
  low_stock_threshold: number | null;
  stock_version: number;
  status: 'in_stock' | 'low_stock' | 'out_of_stock' | 'negative';
  last_sync_time: Date | null;
  product_status: ProductStatus;
  expired_at?: Date | null;
  updated_at: Date;
}

// List stock response (when product_id is NOT provided)
export interface GetStockListResponse {
  stocks: StockListResponse[];
  summary: StockSummary;
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  version?: number;
  last_sync_time?: Date | null;
}

export type GetStockResponse = GetStockByProductResponse | GetStockListResponse;

export interface StockInRequest {
  product_id: number;
  quantity: number;
  cost?: number;
  supplier?: string;
  date?: Date;
  received_at?: Date;
  expired_at?: Date;
}

export interface StockInResponse {
  movement_id: number;
  product_id: number;
  movement_type: StockMovementType;
  quantity: number;
  cost?: number | null;
  supplier?: string | null;
  stock: {
    stock_id: number;
    quantity: number;
    stock_version: number;
  };
  created_at: Date;
}

export interface StockAdjustRequest {
  product_id: number;
  quantity: number; // Can be negative
  reason?: string;
}

export interface StockAdjustResponse {
  movement_id: number;
  product_id: number;
  movement_type: StockMovementType;
  quantity: number;
  reason?: string | null;
  stock: {
    stock_id: number;
    quantity: number;
    stock_version: number;
  };
  created_at: Date;
}

export interface StockReturnRequest {
  product_id: number;
  quantity: number;
  order_id?: number;
  reason?: string;
}

export interface StockReturnResponse {
  movement_id: number;
  product_id: number;
  movement_type: StockMovementType;
  quantity: number;
  order_id?: number | null;
  reason?: string | null;
  stock: {
    stock_id: number;
    quantity: number;
    stock_version: number;
  };
  created_at: Date;
}

export interface GetStockMovementsRequest {
  product_id?: number;
  movement_type?: StockMovementType | string;
  date_from?: string;
  date_to?: string;
  product_name?: string;
  barcode?: string;
  page?: number;
  limit?: number;
}

export interface StockMovementResponse {
  movement_id: number;
  product_id: number;
  movement_type: StockMovementType;
  quantity: number;
  cost?: number | null;
  supplier?: string | null;
  image_path?: string | null;
  expired_at?: Date | null;
  created_at: Date;
}

export interface GetStockMovementsResponse {
  movements: StockMovementResponse[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}
