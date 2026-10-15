CREATE TABLE IF NOT EXISTS payment_methods (
    payment_method_id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    code VARCHAR(50) NOT NULL UNIQUE,
    type VARCHAR(50) NOT NULL DEFAULT 'BANK_TRANSFER',
    account_name VARCHAR(150),
    account_number VARCHAR(100),
    qr_code_url VARCHAR(500),
    note VARCHAR(255),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    is_system BOOLEAN NOT NULL DEFAULT FALSE,
    display_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_payment_methods_is_active ON payment_methods(is_active);
CREATE INDEX IF NOT EXISTS idx_payment_methods_code ON payment_methods(code);
CREATE INDEX IF NOT EXISTS idx_payment_methods_display_order ON payment_methods(display_order);

INSERT INTO payment_methods (name, code, type, is_active, is_system, display_order)
VALUES 
  ('Cash (សាច់ប្រាក់)', 'CASH', 'CASH', TRUE, TRUE, 1),
  ('ABA Bank (KHQR)', 'ABA', 'BANK_TRANSFER', TRUE, FALSE, 2),
  ('Wing Bank', 'WING', 'BANK_TRANSFER', TRUE, FALSE, 3),
  ('ACLEDA Bank', 'ACLEDA', 'BANK_TRANSFER', TRUE, FALSE, 4)
ON CONFLICT (code) DO NOTHING;
