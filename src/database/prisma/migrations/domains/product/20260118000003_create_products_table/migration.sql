CREATE TABLE products (
    product_id SERIAL PRIMARY KEY,
    product_code VARCHAR(50) NOT NULL UNIQUE,
    product_name VARCHAR(200) NOT NULL,
    barcode VARCHAR(255) NOT NULL UNIQUE,
    price DECIMAL(10,2) NOT NULL,
    avg_cost DECIMAL(10,2),
    last_purchase_cost DECIMAL(10,2),
    has_expiry BOOLEAN NOT NULL DEFAULT FALSE,
    category VARCHAR(100),
    description TEXT,
    image_path VARCHAR(500),
    low_stock_threshold INTEGER,
    reorder_point INTEGER NOT NULL DEFAULT 0,
    status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK(status IN ('active', 'inactive')),
    created_by INTEGER NOT NULL REFERENCES users(user_id),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_by INTEGER NOT NULL REFERENCES users(user_id),
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deactivated_date TIMESTAMP
);

CREATE INDEX idx_products_product_code ON products(product_code);
CREATE INDEX idx_products_barcode ON products(barcode);
CREATE INDEX idx_products_status ON products(status);
CREATE INDEX idx_products_category ON products(category);
CREATE INDEX idx_products_has_expiry ON products(has_expiry);