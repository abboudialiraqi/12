-- Add category_ids array to products for multi-category support
ALTER TABLE products ADD COLUMN IF NOT EXISTS category_ids uuid[] DEFAULT '{}';

-- Index for fast filtering
CREATE INDEX IF NOT EXISTS idx_products_category_ids ON products USING GIN (category_ids);
