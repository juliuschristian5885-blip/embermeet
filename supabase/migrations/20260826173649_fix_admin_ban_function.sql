/*
# Fix: Admin ban/unban via SECURITY DEFINER function

## Problem
The previous migration revoked UPDATE on `is_banned` and `role` columns from all
authenticated users — including admins. This means the admin panel's ban/unban
feature silently fails because the RLS column privilege blocks it.

## Fix
Create a SECURITY DEFINER function `admin_toggle_ban` that:
- Verifies the caller is an admin (checks profiles.role = 'admin')
- Toggles the is_banned flag on the target user
- Returns success/error

This bypasses column-level privileges because SECURITY DEFINER runs as the
function owner (postgres), which has full access. The admin check inside the
function body ensures only admins can call it.

## Security
- Function is SECURITY DEFINER (runs with owner privileges)
- Only callable by authenticated role
- Internal check ensures caller has admin role
- search_path is locked to pg_catalog, public
*/

CREATE OR REPLACE FUNCTION admin_toggle_ban(target_user_id uuid, ban boolean)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  caller_role text;
BEGIN
  SELECT role INTO caller_role FROM profiles WHERE id = auth.uid();

  IF caller_role IS NULL OR caller_role != 'admin' THEN
    RETURN jsonb_build_object('error', 'Unauthorized: admin access required');
  END IF;

  UPDATE profiles SET is_banned = ban WHERE id = target_user_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'User not found');
  END IF;

  RETURN jsonb_build_object('success', true);
END;
$$;

GRANT EXECUTE ON FUNCTION admin_toggle_ban(uuid, boolean) TO authenticated;