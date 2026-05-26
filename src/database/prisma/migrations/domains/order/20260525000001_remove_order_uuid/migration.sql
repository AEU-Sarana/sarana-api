-- Drop order_uuid column from orders table
ALTER TABLE orders DROP COLUMN IF EXISTS order_uuid;
