CREATE TABLE telegram_admin_messages (
    id SERIAL PRIMARY KEY,
    telegram_user_id BIGINT NOT NULL,
    command TEXT NOT NULL,
    request_id UUID,
    status VARCHAR(10) NOT NULL DEFAULT 'SENT'
        CHECK(status IN ('SENT', 'FAILED')),
    message_id BIGINT,
    error_message TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_telegram_admin_messages_user ON telegram_admin_messages(telegram_user_id);
CREATE INDEX idx_telegram_admin_messages_request ON telegram_admin_messages(request_id);