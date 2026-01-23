import { StockMovementType } from '../enums/stock-movement-type.enum';

export interface GetStockRequest {
  product_id?: number;
  version?: number;
  page?: number;
  limit?: number;
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

export interface GetStockResponse {
  stock?: StockResponse;
  stocks?: StockResponse[];
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  version?: number;
  last_sync_time?: Date | null;
}

export interface StockInRequest {
  product_id: number;
  quantity: number;
  cost?: number;
  supplier?: string;
  date?: Date;
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
  page?: number;
  limit?: number;
}

export interface StockMovementResponse {
  movement_id: number;
  product_id: number;
  movement_type: StockMovementType;
  quantity: number;
  cost?: number | null;
  price?: number | null;
  supplier?: string | null;
  reason?: string | null;
  order_id?: number | null;
  shift_id?: number | null;
  created_by: number;
  created_at: Date;
  product: {
    product_id: number;
    product_name: string;
    product_code: string;
  };
  created_by_user: {
    user_id: number;
    username: string;
    full_name: string;
  };
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