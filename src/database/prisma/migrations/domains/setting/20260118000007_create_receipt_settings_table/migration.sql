CREATE TABLE receipt_settings (
    setting_id SERIAL PRIMARY KEY,
    store_name VARCHAR(200) NOT NULL,
    logo_path VARCHAR(500),
    phone VARCHAR(30),
    address TEXT,
    tax_id VARCHAR(100),
    footer_note TEXT,
    is_logo_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    is_footer_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    tenant_id INTEGER NOT NULL DEFAULT 1,
    updated_by INTEGER REFERENCES users(user_id),
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX idx_receipt_settings_tenant_id ON receipt_settings(tenant_id);
CREATE INDEX idx_receipt_settings_updated_at ON receipt_settings(updated_at);
CREATE INDEX idx_receipt_settings_store_name ON receipt_settings(store_name);

INSERT INTO receipt_settings (
    store_name, is_logo_enabled, is_footer_enabled, tenant_id, updated_by
)
VALUES (
    'My Store', TRUE, TRUE, 1, NULL 
);
