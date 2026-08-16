CREATE TABLE goods_received (
    gr_id SERIAL PRIMARY KEY,
    gr_number VARCHAR(50) NOT NULL UNIQUE,
    po_id INTEGER REFERENCES purchase_orders(po_id) ON DELETE SET NULL,
    supplier_id INTEGER NOT NULL REFERENCES suppliers(supplier_id) ON DELETE RESTRICT,
    received_date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    invoice_number VARCHAR(100),
    total_received_amount DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    notes TEXT,
    received_by INTEGER NOT NULL REFERENCES users(user_id) ON DELETE RESTRICT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX idx_goods_received_gr_number ON goods_received(gr_number);
CREATE INDEX idx_goods_received_po_id ON goods_received(po_id);
CREATE INDEX idx_goods_received_supplier_id ON goods_received(supplier_id);
CREATE INDEX idx_goods_received_received_date ON goods_received(received_date);
