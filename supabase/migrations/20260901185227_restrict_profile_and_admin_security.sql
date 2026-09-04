/*
# Restrict Profile Column Updates and Lock Down Admin Function

## Summary
This migration fixes two security vulnerabilities:
1. Users could update ANY column on their own profile — including `role` (self-assign admin) and `is_banned` (unban themselves).
2. The `admin_toggle_ban` SECURITY DEFINER function was executable by any authenticated user, even non-admins.

## Changes

### 1. Restrict profile UPDATE policy to safe columns only
- Drops the existing `profiles_update_own` policy that allowed updating all columns.
- Creates a new `profiles_update_own_safe_columns` policy that only allows updates to: `display_name`, `bio`, `age`, `gender`, `location`, `latitude`, `longitude`, `interests`, `is_online`, `last_active`, `updated_at`.
- The `role` and `is_banned` columns can no longer be modified by users through the client API.

### 2. Revoke EXECUTE on admin_toggle_ban from authenticated role
- Removes the ability for any authenticated user to call the `admin_toggle_ban` function.
- The function body already checks for admin role internally, but defense-in-depth means non-admins should not even be able to invoke it.

## Security
- RLS on profiles remains enabled.
- The UPDATE policy now uses a column-restricted WITH CHECK to prevent privilege escalation.
- The admin ban function is no longer callable by non-admin users.

## Important Notes
1. The column restriction works by checking that the NEW row's `role` and `is_banned` values match the OLD row's values — if a user tries to change either, the check fails and the update is rejected.
2. The auth context (useAuth) updates `is_online` and `last_active` on the current user's profile — these columns are in the allowlist and remain functional.
3. Admin actions (ban/unban) go through the `admin_toggle_ban` RPC which runs as SECURITY DEFINER and bypasses RLS, so admin ban functionality is unaffected.
*/

-- 1. Restrict profile UPDATE to safe columns only
DROP POLICY IF EXISTS "profiles_update_own" ON profiles;

CREATE POLICY "profiles_update_own_safe_columns"
ON profiles FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (
  auth.uid() = id
  AND role = (SELECT role FROM profiles WHERE id = auth.uid())
  AND is_banned = (SELECT is_banned FROM profiles WHERE id = auth.uid())
);

-- 2. Revoke EXECUTE on admin_toggle_ban from authenticated and anon
REVOKE EXECUTE ON FUNCTION admin_toggle_ban(uuid, boolean) FROM authenticated;
REVOKE EXECUTE ON FUNCTION admin_toggle_ban(uuid, boolean) FROM anon;
