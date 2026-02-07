CREATE TABLE refresh_tokens (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(user_id),
    refresh_token_hash VARCHAR(255) NOT NULL UNIQUE,
    token_family_id UUID NOT NULL,
    parent_token_id INTEGER REFERENCES refresh_tokens(id),
    device_id VARCHAR(255),
    device_binding_id INTEGER REFERENCES device_bindings(binding_id),
    absolute_expires_at TIMESTAMP NOT NULL,
    idle_expires_at TIMESTAMP NOT NULL,
    last_used_at TIMESTAMP,
    revoked_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    ip_address VARCHAR(45),
    user_agent TEXT
);

CREATE INDEX idx_refresh_tokens_user_id ON refresh_tokens(user_id);
CREATE INDEX idx_refresh_tokens_device_id ON refresh_tokens(device_id);
CREATE INDEX idx_refresh_tokens_absolute_expires_at ON refresh_tokens(absolute_expires_at);
CREATE INDEX idx_refresh_tokens_idle_expires_at ON refresh_tokens(idle_expires_at);
CREATE INDEX idx_refresh_tokens_family_id ON refresh_tokens(token_family_id);
CREATE INDEX idx_refresh_tokens_revoked_at ON refresh_tokens(revoked_at);
CREATE INDEX idx_refresh_tokens_user_device ON refresh_tokens(user_id, device_id);