-- Drop hardcoded role check constraint from users table to allow custom roles
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;

-- Optionally expand role column length to 50 characters to support longer custom role keys
ALTER TABLE users ALTER COLUMN role TYPE VARCHAR(50);
