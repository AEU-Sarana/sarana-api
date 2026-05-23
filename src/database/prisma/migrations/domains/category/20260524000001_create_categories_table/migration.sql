-- Create categories table
CREATE TABLE categories (
    category_id SERIAL PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Add category_id to products
ALTER TABLE products ADD COLUMN category_id INTEGER;

-- Link products to categories
ALTER TABLE products ADD CONSTRAINT fk_products_categories FOREIGN KEY (category_id) REFERENCES categories(category_id) ON DELETE SET NULL;

-- Create index on products(category_id)
CREATE INDEX idx_products_category_id ON products(category_id);

-- Copy existing categories into the new categories table
INSERT INTO categories (name)
SELECT DISTINCT category FROM products WHERE category IS NOT NULL
ON CONFLICT (name) DO NOTHING;

-- Update products to reference the new category IDs
UPDATE products p
SET category_id = c.category_id
FROM categories c
WHERE p.category = c.name;

-- Drop old index and old category column from products
DROP INDEX IF EXISTS idx_products_category;
ALTER TABLE products DROP COLUMN category;
