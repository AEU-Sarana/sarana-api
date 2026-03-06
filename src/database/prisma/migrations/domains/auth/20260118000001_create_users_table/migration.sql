CREATE TABLE users (
    user_id SERIAL PRIMARY KEY,
    username VARCHAR(100) NOT NULL UNIQUE,
    business_name VARCHAR(200),
    address TEXT,  
    email VARCHAR(255),
    password_hash VARCHAR(255) NOT NULL,
    pin_hash VARCHAR(255),
    full_name VARCHAR(200) NOT NULL,
    role VARCHAR(20) NOT NULL CHECK(role IN ('ADMIN', 'SELLER', 'SUPER_ADMIN')),
    phone VARCHAR(20),
    status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK(status IN ('active', 'inactive')),
    device_id VARCHAR(255),
    is_device_bound BOOLEAN NOT NULL DEFAULT FALSE,
    bio TEXT,
    profile_image VARCHAR(500),
    created_by INTEGER REFERENCES users(user_id),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    end_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_by INTEGER REFERENCES users(user_id),
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deactivated_date TIMESTAMP
);

CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_status ON users(status);
CREATE INDEX idx_users_email ON users(email);