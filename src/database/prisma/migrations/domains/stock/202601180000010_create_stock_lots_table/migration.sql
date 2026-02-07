CREATE TABLE stock_lots (
  id SERIAL PRIMARY KEY,
  product_id INTEGER NOT NULL REFERENCES products(product_id),
  qty_on_hand INTEGER NOT NULL CHECK (qty_on_hand >= 0),
  received_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  expired_at DATE,
  cost DECIMAL(10,2),
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_stock_lots_product_expired ON stock_lots(product_id, expired_at);
CREATE INDEX idx_stock_lots_product_received ON stock_lots(product_id, received_at);