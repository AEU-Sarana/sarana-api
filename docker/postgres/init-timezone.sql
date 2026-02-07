-- Initialize PostgreSQL Timezone Settings
-- This script runs automatically on container startup

-- Set server timezone (UTC by default, can be overridden)
SET timezone = 'UTC';

-- Create timezone configuration table (optional, for application use)
CREATE TABLE IF NOT EXISTS timezone_config (
    id SERIAL PRIMARY KEY,
    timezone_name VARCHAR(50) NOT NULL UNIQUE,
    description VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Insert common timezones
INSERT INTO timezone_config (timezone_name, description) VALUES
    ('UTC', 'Coordinated Universal Time'),
    ('Asia/Bangkok', 'Thailand (Bangkok Time)'),
    ('Asia/Ho_Chi_Minh', 'Vietnam (Indochina Time)'),
    ('Asia/Phnom_Penh', 'Cambodia (Indochina Time)'),
    ('Asia/Singapore', 'Singapore (Singapore Time)'),
    ('Asia/Kolkata', 'India (Indian Standard Time)'),
    ('America/New_York', 'New York (Eastern Time)'),
    ('America/Los_Angeles', 'Los Angeles (Pacific Time)'),
    ('Europe/London', 'London (Greenwich Mean Time)'),
    ('Europe/Paris', 'Paris (Central European Time)')
ON CONFLICT (timezone_name) DO NOTHING;

-- Show current timezone settings
SHOW timezone;
