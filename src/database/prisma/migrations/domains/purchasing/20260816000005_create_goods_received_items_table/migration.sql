CREATE TABLE goods_received_items (
    gr_item_id SERIAL PRIMARY KEY,
    gr_id INTEGER NOT NULL REFERENCES goods_received(gr_id) ON DELETE CASCADE,
    po_item_id INTEGER REFERENCES purchase_order_items(po_item_id) ON DELETE SET NULL,
    product_id INTEGER NOT NULL REFERENCES products(product_id) ON DELETE RESTRICT,
    quantity_received INTEGER NOT NULL,
    unit_cost DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    batch_number VARCHAR(100),
    expiry_date TIMESTAMP,
    subtotal DECIMAL(12, 2) NOT NULL DEFAULT 0.00
);

CREATE INDEX idx_goods_received_items_gr_id ON goods_received_items(gr_id);
CREATE INDEX idx_goods_received_items_po_item_id ON goods_received_items(po_item_id);
CREATE INDEX idx_goods_received_items_product_id ON goods_received_items(product_id);
