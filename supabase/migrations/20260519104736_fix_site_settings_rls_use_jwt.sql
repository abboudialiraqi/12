/*
  # Fix site_settings RLS policies — replace auth.users lookup with auth.jwt()

  ## Problem
  The existing admin policies query auth.users directly, which requires
  SELECT privilege on auth.users for the authenticated role. This causes
  a "permission denied for table users" error when the admin tries to
  upsert settings.

  ## Fix
  Replace `EXISTS (SELECT 1 FROM auth.users ...)` with
  `(auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'`
  which reads the JWT claim directly without touching auth.users.
*/

-- Drop old policies
DROP POLICY IF EXISTS "Admins can insert site settings" ON site_settings;
DROP POLICY IF EXISTS "Admins can update site settings" ON site_settings;
DROP POLICY IF EXISTS "Admins can delete site settings" ON site_settings;

-- Re-create using JWT claim (no auth.users query needed)
CREATE POLICY "Admins can insert site settings"
  ON site_settings FOR INSERT
  TO authenticated
  WITH CHECK ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

CREATE POLICY "Admins can update site settings"
  ON site_settings FOR UPDATE
  TO authenticated
  USING  ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin')
  WITH CHECK ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

CREATE POLICY "Admins can delete site settings"
  ON site_settings FOR DELETE
  TO authenticated
  USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');
