export interface StockMovementCreatedEvent {
    movement_id: number;
    product_id: number;
    movement_type: 'STOCK_IN' | 'STOCK_OUT' | 'ADJUSTMENT' | 'RETURN';
    quantity: number;
    reason?: string;
    order_id?: number;
    created_by: number;
    created_at: Date;
}