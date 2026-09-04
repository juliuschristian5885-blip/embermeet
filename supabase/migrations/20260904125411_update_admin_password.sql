/*
# Update Admin User Password

## Summary
Updates the password for the admin user account (admin@ember.com) in the Supabase auth system.
This migration uses the auth.users table to set a new bcrypt-hashed password.

## Modified Tables
- `auth.users` — updates the `encrypted_password` column for the admin user with a new bcrypt hash

## Security
- No changes to RLS policies
- Only affects the single admin user identified by their known UUID

## Important Notes
1. The password is hashed using bcrypt via PostgreSQL's `crypt()` function with `gen_salt('bf')`
2. This is a one-time administrative operation
*/

UPDATE auth.users
SET encrypted_password = crypt('tZAx7%Tqav5DGiin', gen_salt('bf'))
WHERE id = 'a0000000-0000-0000-0000-000000000001'
RETURNING email;
