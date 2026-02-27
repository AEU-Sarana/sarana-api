CREATE TABLE orders (
    order_id SERIAL PRIMARY KEY,
    order_uuid UUID NOT NULL UNIQUE,
    receipt_number VARCHAR(50) NOT NULL UNIQUE,
    shift_id INTEGER NOT NULL REFERENCES shifts(shift_id),
    seller_id INTEGER NOT NULL REFERENCES users(user_id),
    order_date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    total_amount DECIMAL(10,2) NOT NULL,
    discount_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
    tax_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
    service_fee DECIMAL(10,2) NOT NULL DEFAULT 0,
    payment_method VARCHAR(20) NOT NULL DEFAULT 'CASH' CHECK(payment_method IN ('CASH')),
    exchange_rate DECIMAL(10,2) NOT NULL DEFAULT 4000,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX idx_orders_order_uuid ON orders(order_uuid);
CREATE UNIQUE INDEX idx_orders_receipt_number ON orders(receipt_number);
CREATE INDEX idx_orders_shift_id ON orders(shift_id);
CREATE INDEX idx_orders_seller_id ON orders(seller_id);
CREATE INDEX idx_orders_order_date ON orders(order_date);
CREATE INDEX idx_orders_created_at ON orders(created_at);
CREATE INDEX idx_orders_seller_date ON orders(seller_id, order_date);