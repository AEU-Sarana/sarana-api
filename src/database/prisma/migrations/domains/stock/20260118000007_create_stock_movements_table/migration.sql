CREATE TABLE stock_movements (
    movement_id SERIAL PRIMARY KEY,
    product_id INTEGER NOT NULL REFERENCES products(product_id),
    movement_type VARCHAR(20) NOT NULL CHECK(movement_type IN ('STOCK_IN', 'STOCK_OUT', 'ADJUSTMENT', 'RETURN')),
    quantity INTEGER NOT NULL,
    cost DECIMAL(10,2),
    price DECIMAL(10,2),
    supplier VARCHAR(200),
    reason TEXT,
    order_id INTEGER REFERENCES orders(order_id),
    shift_id INTEGER REFERENCES shifts(shift_id),
    created_by INTEGER NOT NULL REFERENCES users(user_id),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_stock_movements_product_id ON stock_movements(product_id);
CREATE INDEX idx_stock_movements_type ON stock_movements(movement_type);
CREATE INDEX idx_stock_movements_created_at ON stock_movements(created_at);
CREATE INDEX idx_stock_movements_order_id ON stock_movements(order_id);
CREATE INDEX idx_stock_movements_shift_id ON stock_movements(shift_id);