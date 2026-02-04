-- Composite indexes for report-heavy queries
CREATE INDEX idx_orders_seller_date ON orders(seller_id, order_date);
CREATE INDEX idx_order_items_order_product ON order_items(order_id, product_id);
CREATE INDEX idx_shifts_seller_date ON shifts(seller_id, shift_date);
