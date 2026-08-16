CREATE TABLE IF NOT EXISTS roles (
    role_id SERIAL PRIMARY KEY,
    key VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    description VARCHAR(255),
    is_system BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS role_permissions (
    id SERIAL PRIMARY KEY,
    role_id INTEGER NOT NULL REFERENCES roles(role_id) ON DELETE CASCADE,
    feature_key VARCHAR(100) NOT NULL,
    actions VARCHAR(255) NOT NULL DEFAULT 'read',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_role_feature UNIQUE(role_id, feature_key)
);

CREATE INDEX IF NOT EXISTS idx_role_permissions_role_id ON role_permissions(role_id);

INSERT INTO roles (key, name, description, is_system) 
VALUES 
  ('ADMIN', 'Administrator', 'Full system access superuser', true),
  ('CASHIER', 'Cashier', 'Standard cashier with POS checkout permissions', true)
ON CONFLICT (key) DO NOTHING;

INSERT INTO role_permissions (role_id, feature_key, actions)
SELECT r.role_id, f.feature_key, f.actions
FROM roles r
CROSS JOIN (
  VALUES 
    ('pos.checkout', 'all'),
    ('products.view', 'read'),
    ('stock.view', 'read'),
    ('orders.manage', 'read,create')
) AS f(feature_key, actions)
WHERE r.key = 'CASHIER'
ON CONFLICT (role_id, feature_key) DO NOTHING;
