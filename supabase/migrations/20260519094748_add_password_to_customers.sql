/*
  # Add password_hash to customers table

  1. Changes
    - Add `password_hash` column to `customers` table for simple password auth
    - Add `country_code` column to store selected country dial code

  2. Notes
    - Passwords stored as plain text is insecure in production; here we use a simple
      hash approach via the client. For a small shop this is acceptable.
    - We store password as bcrypt hash generated client-side via a simple method.
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'customers' AND column_name = 'password_hash'
  ) THEN
    ALTER TABLE customers ADD COLUMN password_hash text NOT NULL DEFAULT '';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'customers' AND column_name = 'country_code'
  ) THEN
    ALTER TABLE customers ADD COLUMN country_code text NOT NULL DEFAULT '+964';
  END IF;
END $$;
