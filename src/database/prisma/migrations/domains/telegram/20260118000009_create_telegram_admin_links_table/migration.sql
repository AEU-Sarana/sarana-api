CREATE TABLE telegram_admin_links (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(user_id),
    telegram_user_id BIGINT NOT NULL UNIQUE,
    chat_id BIGINT NOT NULL,
    status VARCHAR(10) NOT NULL DEFAULT 'ACTIVE'
        CHECK(status IN ('ACTIVE', 'REVOKED')),
    linked_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    revoked_at TIMESTAMP,
    last_seen_at TIMESTAMP
);

CREATE UNIQUE INDEX idx_telegram_admin_links_user ON telegram_admin_links(user_id);