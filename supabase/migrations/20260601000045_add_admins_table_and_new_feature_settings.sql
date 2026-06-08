/*
  # Add Admins Table and New Feature Settings

  ## Changes
  1. New Table: `admins`
     - Stores additional admin user IDs managed by the primary admin
     - `id` (uuid, PK)
     - `user_id` (text, references auth.users uuid as text)
     - `email` (text)
     - `created_at` (timestamp)
  2. New site_settings keys:
     - `show_product_toggle` (1/0) - show/hide product visibility button in admin
     - `show_stock_count` (1/0) - toggle stock count visibility for customers
     - `promo_banners` (JSON) - promotional banner slides with image, link, position
     - `why_us_title`, `why_us_subtitle` - editable why-us section titles
     - `why_us_1_title` through `why_us_4_desc` - editable why-us items
  3. Products table: `color_images` column (jsonb) already added in previous migration - no change needed
  4. RLS policies for admins table
*/

-- Create admins table
CREATE TABLE IF NOT EXISTS admins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL UNIQUE,
  email text NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE admins ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view all admins"
  ON admins FOR SELECT
  TO authenticated
  USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
  );

CREATE POLICY "Admins can insert admins"
  ON admins FOR INSERT
  TO authenticated
  WITH CHECK (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
  );

CREATE POLICY "Admins can delete admins"
  ON admins FOR DELETE
  TO authenticated
  USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
  );

-- Insert default settings for new features (only if they don't exist)
INSERT INTO site_settings (key, value) VALUES
  ('show_stock_count', '0'),
  ('promo_banners', '[]'),
  ('why_us_title', 'لماذا تختار سحاب؟'),
  ('why_us_subtitle', 'نقدم لك تجربة تسوق استثنائية'),
  ('why_us_1_title', 'دفع آمن 100%'),
  ('why_us_1_desc', 'جميع المدفوعات محمية'),
  ('why_us_2_title', 'توصيل سريع للمحافظات'),
  ('why_us_2_desc', 'بغداد 24h | المحافظات 48h'),
  ('why_us_3_title', 'دعم على مدار الساعة'),
  ('why_us_3_desc', 'واتساب في أي وقت'),
  ('why_us_4_title', 'منتجات أصلية مضمونة'),
  ('why_us_4_desc', 'جودة عالية بأسعار منافسة')
ON CONFLICT (key) DO NOTHING;

-- Add color_images column to products if not exists (may have been added in previous migration)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'products' AND column_name = 'color_images'
  ) THEN
    ALTER TABLE products ADD COLUMN color_images jsonb DEFAULT '{}';
  END IF;
END $$;
