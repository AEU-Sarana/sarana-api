ALTER TABLE orders
  ADD COLUMN tenant_id INTEGER NOT NULL DEFAULT 1;

-- Backfill tenant_id based on seller's tenant
UPDATE orders o
SET tenant_id = u.tenant_id
FROM users u
WHERE o.seller_id = u.user_id;

CREATE INDEX idx_orders_tenant_id ON orders(tenant_id);
