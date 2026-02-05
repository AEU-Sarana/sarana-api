CREATE TABLE telegram_config (
    config_id SERIAL PRIMARY KEY,
    bot_token TEXT NOT NULL,
    group_chat_id VARCHAR(255) NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    last_test_time TIMESTAMP,
    last_test_status VARCHAR(20) CHECK(last_test_status IN ('SUCCESS', 'FAILED')),
    created_by INTEGER NOT NULL REFERENCES users(user_id),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_by INTEGER NOT NULL REFERENCES users(user_id),
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX idx_telegram_config_active ON telegram_config(is_active) WHERE is_active = TRUE;