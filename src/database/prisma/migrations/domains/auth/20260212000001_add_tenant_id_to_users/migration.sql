ALTER TABLE users
  ADD COLUMN tenant_id INTEGER NOT NULL DEFAULT 1;

CREATE INDEX idx_users_tenant_id ON users(tenant_id);
