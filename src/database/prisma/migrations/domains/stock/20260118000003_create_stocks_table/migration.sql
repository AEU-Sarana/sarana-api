CREATE TABLE stocks (
    stock_id SERIAL PRIMARY KEY,
    product_id INTEGER NOT NULL UNIQUE REFERENCES products(product_id),
    quantity INTEGER NOT NULL DEFAULT 0,
    stock_version INTEGER NOT NULL DEFAULT 1,
    last_sync_time TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX idx_stocks_product_id ON stocks(product_id);
CREATE INDEX idx_stocks_version ON stocks(stock_version);