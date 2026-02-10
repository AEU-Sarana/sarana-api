CREATE TABLE customer_telegram_links (
    id SERIAL PRIMARY KEY,
    customer_id INTEGER UNIQUE NOT NULL REFERENCES customers(customer_id) ON DELETE CASCADE,
    telegram_chat_id BIGINT NOT NULL,
    telegram_user_id BIGINT,
    linked_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
