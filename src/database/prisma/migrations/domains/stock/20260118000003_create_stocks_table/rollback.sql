-- Rollback migration for create_stocks_table
-- This will drop the stocks table and its indexes

DROP INDEX IF EXISTS idx_stocks_version;
DROP INDEX IF EXISTS idx_stocks_product_id;
DROP TABLE IF EXISTS stocks CASCADE;

