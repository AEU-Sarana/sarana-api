ALTER TABLE app_settings
  ADD COLUMN IF NOT EXISTS tenant_id INTEGER NOT NULL DEFAULT 1;

DROP INDEX IF EXISTS idx_app_settings_singleton;

CREATE UNIQUE INDEX IF NOT EXISTS idx_app_settings_tenant_id ON app_settings(tenant_id);
