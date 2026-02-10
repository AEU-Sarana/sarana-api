CREATE TABLE receipt_deliveries (
    id SERIAL PRIMARY KEY,
    order_id INTEGER NOT NULL REFERENCES orders(order_id) ON DELETE CASCADE,
    telegram_chat_id BIGINT NOT NULL,
    status VARCHAR(20) NOT NULL,
    sent_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(order_id, telegram_chat_id)
);
