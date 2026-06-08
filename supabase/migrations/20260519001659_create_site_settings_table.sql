/*
  # Create site_settings table for CMS

  1. New Tables
    - `site_settings`
      - `id` (uuid, primary key)
      - `key` (text, unique) - setting key like 'hero_title', 'footer_phone', etc.
      - `value` (text) - setting value
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS on `site_settings` table
    - Public can read settings (needed for frontend display)
    - Only admins can insert/update/delete settings

  3. Default Data
    - Pre-populate with current hardcoded values from the site
*/

CREATE TABLE IF NOT EXISTS site_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text UNIQUE NOT NULL,
  value text NOT NULL DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE site_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can read site settings"
  ON site_settings FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Admins can insert site settings"
  ON site_settings FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND auth.users.raw_app_meta_data->>'role' = 'admin'
    )
  );

CREATE POLICY "Admins can update site settings"
  ON site_settings FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND auth.users.raw_app_meta_data->>'role' = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND auth.users.raw_app_meta_data->>'role' = 'admin'
    )
  );

CREATE POLICY "Admins can delete site settings"
  ON site_settings FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND auth.users.raw_app_meta_data->>'role' = 'admin'
    )
  );

-- Pre-populate with current site content
INSERT INTO site_settings (key, value) VALUES
  -- Top bar
  ('top_bar_text', 'توصيل مجاني للطلبات فوق 100,000 د.ع | خصومات تصل إلى 30%'),

  -- Hero section
  ('hero_badge', 'عروض حصرية تصل إلى 30%'),
  ('hero_title', 'كل ما تحتاجه'),
  ('hero_title_highlight', 'للإبداع والتعلم'),
  ('hero_description', 'اكتشف مجموعتنا الواسعة من الأدوات المدرسية والمكتبية. أقلام، دفاتر، ألوان، وأكثر بأفضل الأسعار مع توصيل سريع.'),
  ('hero_cta_primary', 'تسوق الآن'),
  ('hero_cta_secondary', 'تصفح العروض'),

  -- Features
  ('feature_1_title', 'توصيل سريع'),
  ('feature_1_desc', 'خلال 24 ساعة'),
  ('feature_2_title', 'ضمان الجودة'),
  ('feature_2_desc', 'منتجات أصلية 100%'),
  ('feature_3_title', 'دعم متواصل'),
  ('feature_3_desc', 'خدمة عملاء 24/7'),
  ('feature_4_title', 'عروض يومية'),
  ('feature_4_desc', 'خصومات حصرية'),

  -- Categories section
  ('categories_title', 'تسوق حسب القسم'),
  ('categories_subtitle', 'اختر القسم المناسب لك'),

  -- Featured products section
  ('featured_title', 'منتجات مميزة'),
  ('featured_subtitle', 'أفضل المنتجات المختارة لكم'),

  -- CTA / Newsletter section
  ('cta_title', 'اشترك في نشرتنا البريدية'),
  ('cta_description', 'احصل على أحدث العروض والخصومات مباشرة في بريدك الإلكتروني'),
  ('cta_button_text', 'اشترك'),

  -- Footer
  ('footer_brand_description', 'وجهتك الأولى للأدوات المدرسية والمكتبية. نوفر لك كل ما تحتاجه من أقلام ودفاتر وألوان وأدوات هندسية بأفضل الأسعار.'),
  ('footer_phone', '+964 784 004 0066'),
  ('footer_email', 'info@suhab.iq'),
  ('footer_address', 'بغداد، العراق'),

  -- Checkout
  ('whatsapp_number', '9647840040066'),
  ('zain_cash_number', '07815090999'),
  ('super_key_number', '6478539312'),
  ('free_shipping_threshold', '100000'),
  ('shipping_cost_baghdad', '5000'),
  ('shipping_cost_other', '6000'),

  -- Store info
  ('store_name', 'سحاب'),
  ('store_tagline', 'للأدوات المدرسية والمكتبية')
ON CONFLICT (key) DO NOTHING;
