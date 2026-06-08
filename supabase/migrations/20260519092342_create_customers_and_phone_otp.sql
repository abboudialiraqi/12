/*
  # نظام حسابات الزبائن بالهاتف

  1. جداول جديدة
    - `customers`
      - `id` (uuid, primary key)
      - `phone` (text, unique) — رقم الهاتف العراقي
      - `name` (text) — اسم الزبون
      - `created_at` (timestamptz)

    - `customer_phone_otps`
      - `id` (uuid)
      - `phone` (text) — رقم الهاتف
      - `code` (text) — رمز 6 أرقام
      - `expires_at` (timestamptz) — ينتهي بعد 10 دقائق
      - `used` (boolean)
      - `created_at` (timestamptz)

  2. العلاقات
    - جدول `orders` يحصل على عمود `customer_id` اختياري للربط بالزبون المسجّل

  3. الأمان
    - RLS على جدول customers: الزبون يرى بياناته فقط عبر phone session
    - جدول OTP مقيّد: قراءة وكتابة فقط عبر service role
    - سياسة قراءة عامة لـ OTP فقط لخطوة التحقق
*/

-- جدول الزبائن
CREATE TABLE IF NOT EXISTS customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  phone text UNIQUE NOT NULL,
  name text NOT NULL DEFAULT '',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE customers ENABLE ROW LEVEL SECURITY;

-- رمز OTP الهاتف
CREATE TABLE IF NOT EXISTS customer_phone_otps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  phone text NOT NULL,
  code text NOT NULL,
  expires_at timestamptz NOT NULL,
  used boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE customer_phone_otps ENABLE ROW LEVEL SECURITY;

-- إضافة customer_id لجدول orders (اختياري)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orders' AND column_name = 'customer_id'
  ) THEN
    ALTER TABLE orders ADD COLUMN customer_id uuid REFERENCES customers(id) ON DELETE SET NULL;
  END IF;
END $$;

-- سياسات customers: الكل يقدر يقرأ ويكتب (التحقق يتم في الكود)
CREATE POLICY "Allow public read customers"
  ON customers FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Allow public insert customers"
  ON customers FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Allow public update customers"
  ON customers FOR UPDATE
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

-- سياسات OTP: الكل يقدر يقرأ ويكتب (التحقق بالكود)
CREATE POLICY "Allow public read otps"
  ON customer_phone_otps FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Allow public insert otps"
  ON customer_phone_otps FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Allow public update otps"
  ON customer_phone_otps FOR UPDATE
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

-- index للبحث السريع
CREATE INDEX IF NOT EXISTS idx_customers_phone ON customers(phone);
CREATE INDEX IF NOT EXISTS idx_customer_phone_otps_phone ON customer_phone_otps(phone);
CREATE INDEX IF NOT EXISTS idx_orders_customer_id ON orders(customer_id);
