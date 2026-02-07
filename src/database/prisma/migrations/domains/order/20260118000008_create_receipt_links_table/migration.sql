CREATE TABLE receipt_links (
    receipt_link_id SERIAL PRIMARY KEY,
    order_id INTEGER NOT NULL REFERENCES orders(order_id),
    code VARCHAR(100) NOT NULL UNIQUE,
    link_status VARCHAR(20) NOT NULL DEFAULT 'PENDING'
        CHECK(link_status IN ('PENDING', 'USED', 'EXPIRED', 'REVOKED')),
    expires_at TIMESTAMP NOT NULL,
    used_at TIMESTAMP,
    telegram_user_id BIGINT,
    telegram_chat_id BIGINT,
    telegram_username VARCHAR(255),
    created_by INTEGER NOT NULL REFERENCES users(user_id),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX idx_receipt_links_code ON receipt_links(code);
CREATE INDEX idx_receipt_links_order_id ON receipt_links(order_id);
CREATE INDEX idx_receipt_links_status ON receipt_links(link_status);
CREATE INDEX idx_receipt_links_expires_at ON receipt_links(expires_at);
CREATE INDEX idx_receipt_links_created_at ON receipt_links(created_at);
CREATE INDEX idx_receipt_links_telegram_user_id ON receipt_links(telegram_user_id);