/*
  # Create admin verification codes table for WhatsApp 2FA

  1. New Tables
    - `admin_verification_codes`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references auth.users)
      - `code` (text) - 6-digit verification code
      - `whatsapp_number` (text) - WhatsApp number to send to
      - `expires_at` (timestamptz) - code expiration (5 minutes)
      - `used` (boolean, default false)
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS
    - Only the admin user can read/insert their own codes
    - Codes are automatically deleted after use
*/

CREATE TABLE IF NOT EXISTS admin_verification_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  code text NOT NULL,
  whatsapp_number text NOT NULL,
  expires_at timestamptz NOT NULL,
  used boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE admin_verification_codes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own verification codes"
  ON admin_verification_codes FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own verification codes"
  ON admin_verification_codes FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own verification codes"
  ON admin_verification_codes FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_verification_codes_user_id ON admin_verification_codes(user_id);
CREATE INDEX IF NOT EXISTS idx_verification_codes_expires ON admin_verification_codes(expires_at);
