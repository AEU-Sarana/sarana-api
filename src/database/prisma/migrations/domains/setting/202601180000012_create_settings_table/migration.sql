CREATE TABLE app_settings (
    setting_id SERIAL PRIMARY KEY,
    auto_backup BOOLEAN NOT NULL DEFAULT TRUE,
    backup_frequency VARCHAR(20) NOT NULL DEFAULT 'daily' 
        CHECK(backup_frequency IN ('daily', 'weekly', 'monthly')),
    device_binding_enabled BOOLEAN NOT NULL DEFAULT FALSE,
    stock_sync_policy VARCHAR(50) NOT NULL DEFAULT 'allow_with_cached'
        CHECK(stock_sync_policy IN ('allow_with_cached', 'block_until_sync')),
    updated_by INTEGER NOT NULL REFERENCES users(user_id),
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Singleton constraint (only one row allowed)
CREATE UNIQUE INDEX idx_app_settings_singleton ON app_settings((1));