export interface StockUpdatedEvent {
    product_id: number;
    quantity: number;
    stock_version: number;
    movement_type: 'STOCK_IN' | 'STOCK_OUT' | 'ADJUSTMENT' | 'RETURN';
    updated_by: number;
    updated_at: Date;
}