CREATE INDEX IF NOT EXISTS idx_stock_movements_product_created_at
ON stock_movements(product_id, created_at DESC);
