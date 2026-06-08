/*
  # Create Stationery Shop Database Schema

  1. New Tables
    - `categories`
      - `id` (uuid, primary key) - Unique category identifier
      - `name` (text) - Category name in Arabic
      - `slug` (text, unique) - URL-friendly category slug
      - `description` (text) - Category description
      - `image_url` (text) - Category image URL
      - `sort_order` (integer) - Display order
      - `created_at` (timestamptz) - Creation timestamp

    - `products`
      - `id` (uuid, primary key) - Unique product identifier
      - `name` (text) - Product name in Arabic
      - `description` (text) - Product description in Arabic
      - `price` (numeric) - Product price
      - `compare_price` (numeric) - Original price for discounts
      - `image_url` (text) - Main product image
      - `images` (text array) - Additional product images
      - `category_id` (uuid, FK) - Reference to categories
      - `sku` (text) - Stock keeping unit
      - `stock` (integer) - Available quantity
      - `is_featured` (boolean) - Featured product flag
      - `is_active` (boolean) - Active/inactive flag
      - `created_at` (timestamptz) - Creation timestamp
      - `updated_at` (timestamptz) - Last update timestamp

    - `orders`
      - `id` (uuid, primary key) - Unique order identifier
      - `customer_name` (text) - Customer full name
      - `customer_email` (text) - Customer email
      - `customer_phone` (text) - Customer phone number
      - `address` (text) - Delivery address
      - `city` (text) - City
      - `notes` (text) - Order notes
      - `total` (numeric) - Order total amount
      - `status` (text) - Order status (pending/confirmed/shipped/delivered)
      - `created_at` (timestamptz) - Creation timestamp
      - `updated_at` (timestamptz) - Last update timestamp

    - `order_items`
      - `id` (uuid, primary key) - Unique item identifier
      - `order_id` (uuid, FK) - Reference to orders
      - `product_id` (uuid, FK) - Reference to products
      - `product_name` (text) - Product name at time of order
      - `quantity` (integer) - Quantity ordered
      - `price` (numeric) - Price at time of order

  2. Security
    - Enable RLS on all tables
    - Categories and products: public read access
    - Orders and order_items: public insert (for checkout), no read access for anon
    - Authenticated users can read their own orders

  3. Indexes
    - Index on products.category_id for fast category lookups
    - Index on products.is_featured for featured products query
    - Index on orders.status for admin filtering
*/

-- Categories table
CREATE TABLE IF NOT EXISTS categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text UNIQUE NOT NULL,
  description text DEFAULT '',
  image_url text DEFAULT '',
  sort_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Products table
CREATE TABLE IF NOT EXISTS products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text DEFAULT '',
  price numeric(10,2) NOT NULL DEFAULT 0,
  compare_price numeric(10,2),
  image_url text DEFAULT '',
  images text[] DEFAULT '{}',
  category_id uuid REFERENCES categories(id) ON DELETE SET NULL,
  sku text DEFAULT '',
  stock integer DEFAULT 0,
  is_featured boolean DEFAULT false,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Orders table
CREATE TABLE IF NOT EXISTS orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_name text NOT NULL,
  customer_email text DEFAULT '',
  customer_phone text NOT NULL,
  address text NOT NULL,
  city text DEFAULT '',
  notes text DEFAULT '',
  total numeric(10,2) NOT NULL DEFAULT 0,
  status text DEFAULT 'pending',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Order items table
CREATE TABLE IF NOT EXISTS order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid REFERENCES orders(id) ON DELETE CASCADE,
  product_id uuid REFERENCES products(id) ON DELETE SET NULL,
  product_name text NOT NULL,
  quantity integer NOT NULL DEFAULT 1,
  price numeric(10,2) NOT NULL DEFAULT 0
);

-- Enable RLS on all tables
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;

-- Categories: public read
CREATE POLICY "Anyone can view categories"
  ON categories FOR SELECT
  TO anon, authenticated
  USING (true);

-- Products: public read (active only)
CREATE POLICY "Anyone can view active products"
  ON products FOR SELECT
  TO anon, authenticated
  USING (is_active = true);

-- Orders: anyone can insert (for checkout)
CREATE POLICY "Anyone can create orders"
  ON orders FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Orders: no public read (only service role can read)
-- Authenticated users can read their own orders by email
CREATE POLICY "Users can read own orders"
  ON orders FOR SELECT
  TO authenticated
  USING (customer_email = auth.jwt() ->> 'email');

-- Order items: anyone can insert
CREATE POLICY "Anyone can create order items"
  ON order_items FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Order items: authenticated users can read their own order items
CREATE POLICY "Users can read own order items"
  ON order_items FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM orders
      WHERE orders.id = order_items.order_id
      AND orders.customer_email = auth.jwt() ->> 'email'
    )
  );

-- Indexes
CREATE INDEX IF NOT EXISTS idx_products_category_id ON products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_featured ON products(is_featured) WHERE is_featured = true;
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
