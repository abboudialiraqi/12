/*
  # Disable public signup - admin-only access

  1. Problem
    - Anyone can currently create an account via signUp()
    - Need to restrict admin access to pre-approved users only

  2. Changes
    - Disable public signup by requiring admin role in app_metadata
    - Only users with app_metadata.role = 'admin' can access admin features
    - New accounts must be created manually via Supabase Dashboard

  3. How to create an admin user
    - Go to Supabase Dashboard > Authentication > Users
    - Click "Add User" > "Create New User"
    - Enter email and password
    - Then run: UPDATE auth.users SET raw_app_meta_data = jsonb_set(raw_app_meta_data, '{role}', '"admin"') WHERE email = 'your-email@example.com';
*/

-- No schema changes needed - the restriction is enforced in the application code
-- by checking user.app_metadata.role === 'admin'
-- Public signup is disabled via Supabase Auth config (email signup disabled)
