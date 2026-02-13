ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS tenant_id INTEGER NOT NULL DEFAULT 1;

-- Backfill tenant_id based on seller's tenant
UPDATE orders o
SET tenant_id = u.tenant_id
FROM users u
WHERE o.seller_id = u.user_id;

CREATE INDEX IF NOT EXISTS idx_orders_tenant_id ON orders(tenant_id);
