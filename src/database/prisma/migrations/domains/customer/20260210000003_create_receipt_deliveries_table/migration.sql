-- Main table (final)
CREATE TABLE receipt_deliveries (
    id SERIAL PRIMARY KEY,

    -- existing
    order_id INTEGER NOT NULL REFERENCES orders(order_id) ON DELETE CASCADE,
    telegram_chat_id BIGINT NOT NULL,
    status VARCHAR(20) NOT NULL,

    -- updated sent_at (now nullable, no default)
    sent_at TIMESTAMP WITHOUT TIME ZONE,

    -- new columns
    receipt_link_id INTEGER REFERENCES receipt_links(receipt_link_id) ON DELETE SET NULL,
    receipt_code VARCHAR(255),
    telegram_message_id BIGINT,
    error_code INTEGER,
    error_message VARCHAR(500),
    last_attempt_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,

    -- new unique constraint (replaces old UNIQUE(order_id, telegram_chat_id))
    CONSTRAINT uq_receipt_deliveries_link_chat UNIQUE (receipt_link_id, telegram_chat_id)
);

-- indexes
CREATE INDEX idx_receipt_deliveries_telegram_chat_id ON receipt_deliveries (telegram_chat_id);
CREATE INDEX idx_receipt_deliveries_link_id ON receipt_deliveries (receipt_link_id);
CREATE INDEX idx_receipt_deliveries_link_chat ON receipt_deliveries (receipt_link_id, telegram_chat_id);
