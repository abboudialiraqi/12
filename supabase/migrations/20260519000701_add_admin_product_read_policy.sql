/*
  # Add admin read access for all products

  1. Problem
    - The current "Anyone can view active products" policy only shows is_active=true products
    - Admin page needs to see ALL products including inactive ones

  2. Changes
    - Add a SELECT policy for authenticated users to view all products (active and inactive)
*/

CREATE POLICY "Authenticated can view all products"
  ON products FOR SELECT
  TO authenticated
  USING (true);
