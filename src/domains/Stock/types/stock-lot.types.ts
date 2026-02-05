export interface StockLotInfo {
  lot_id: number;
  product_id: number;
  product_name: string;
  product_code: string | null;
  qty_on_hand: number;
  received_at: Date;
  expired_at: Date | null;
  cost: number | null;
}

export interface NearExpiryResponse {
  days: number;
  lots: StockLotInfo[];
}

export interface ExpiredLotsResponse {
  lots: StockLotInfo[];
}