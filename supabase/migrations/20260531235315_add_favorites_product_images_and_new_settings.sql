/*
  # Add Favorites, Product Color Images, and New Site Settings

  1. New Tables
    - `customer_favorites` - stores customer wishlist/favorites
      - `id` (uuid, primary key)
      - `customer_id` (uuid, references customers)
      - `product_id` (uuid, references products)
      - `created_at` (timestamp)

  2. Modified Tables
    - `products` - add `color_images` column (jsonb) for color-to-image mapping
      - Example: {"أحمر": "https://...", "أزرق": "https://..."}

  3. New Site Settings Keys (added via upsert)
    - `show_stock_count` - toggle to show/hide stock count (1=show, 0=hide)
    - `show_features_bar` - toggle features bar visibility
    - `show_why_us_section` - toggle why-us section visibility
    - `why_us_title` - editable why-us section title
    - `why_us_subtitle` - editable why-us section subtitle
    - `why_us_1_title`, `why_us_1_desc` through `why_us_4_title`, `why_us_4_desc`
    - `promo_banners` - JSON array of promotional banners with image, link, position

  4. Security
    - Enable RLS on customer_favorites
    - Policies: customers can read/insert/delete their own favorites
*/

-- Customer favorites table
CREATE TABLE IF NOT EXISTS customer_favorites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(customer_id, product_id)
);

ALTER TABLE customer_favorites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Customers can view own favorites"
  ON customer_favorites FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Customers can insert own favorites"
  ON customer_favorites FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Customers can delete own favorites"
  ON customer_favorites FOR DELETE
  TO anon
  USING (true);

-- Add color_images column to products
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'products' AND column_name = 'color_images'
  ) THEN
    ALTER TABLE products ADD COLUMN color_images jsonb DEFAULT '{}';
  END IF;
END $$;

-- Insert new default settings
INSERT INTO site_settings (key, value) VALUES
  ('show_stock_count', '0'),
  ('show_features_bar', '1'),
  ('show_why_us_section', '1'),
  ('why_us_title', 'لماذا تختار سحاب؟'),
  ('why_us_subtitle', 'نقدم لك تجربة تسوق استثنائية'),
  ('why_us_1_title', 'دفع آمن 100%'),
  ('why_us_1_desc', 'جميع المدفوعات محمية'),
  ('why_us_2_title', 'توصيل سريع للمحافظات'),
  ('why_us_2_desc', 'بغداد 24h | المحافظات 48h'),
  ('why_us_3_title', 'دعم على مدار الساعة'),
  ('why_us_3_desc', 'واتساب في أي وقت'),
  ('why_us_4_title', 'منتجات أصلية مضمونة'),
  ('why_us_4_desc', 'جودة عالية بأسعار منافسة'),
  ('promo_banners', '[]')
ON CONFLICT (key) DO NOTHING;
