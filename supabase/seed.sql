-- ============================================================
-- Seeder: Create / Reset user password
-- Run this in Supabase SQL Editor
-- ============================================================

-- Update existing user's password + confirm email
UPDATE auth.users
SET
  encrypted_password = crypt('password', gen_salt('bf')),
  email_confirmed_at = NOW(),
  updated_at = NOW()
WHERE email = 'adrnmgfr@gmail.com';

-- Verify it worked (should return 1 row)
SELECT id, email, email_confirmed_at FROM auth.users WHERE email = 'adrnmgfr@gmail.com';
