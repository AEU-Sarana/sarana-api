CREATE TABLE customer_linking_tokens (
    token VARCHAR(64) PRIMARY KEY,
    customer_id INTEGER NOT NULL REFERENCES customers(customer_id) ON DELETE CASCADE,
    receipt_code VARCHAR(255),
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_linking_tokens_expires ON customer_linking_tokens(expires_at);
