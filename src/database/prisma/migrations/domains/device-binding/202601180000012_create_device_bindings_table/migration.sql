CREATE TABLE device_bindings (
    binding_id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(user_id),
    device_id VARCHAR(255) NOT NULL,
    device_name VARCHAR(200),
    status VARCHAR(20) NOT NULL CHECK(status IN ('PENDING','APPROVED', 'REVOKED')),
    approved_by INTEGER REFERENCES users(user_id),
    approved_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_device_bindings_user_id ON device_bindings(user_id);
CREATE INDEX idx_device_bindings_device_id ON device_bindings(device_id);
CREATE INDEX idx_device_bindings_status ON device_bindings(status);