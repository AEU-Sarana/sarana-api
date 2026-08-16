CREATE TABLE purchase_order_items (
    po_item_id SERIAL PRIMARY KEY,
    po_id INTEGER NOT NULL REFERENCES purchase_orders(po_id) ON DELETE CASCADE,
    product_id INTEGER NOT NULL REFERENCES products(product_id) ON DELETE RESTRICT,
    ordered_quantity INTEGER NOT NULL,
    received_quantity INTEGER NOT NULL DEFAULT 0,
    unit_cost DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    subtotal DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    notes VARCHAR(255)
);

CREATE INDEX idx_purchase_order_items_po_id ON purchase_order_items(po_id);
CREATE INDEX idx_purchase_order_items_product_id ON purchase_order_items(product_id);
