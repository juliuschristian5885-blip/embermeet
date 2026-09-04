/*
# Fix: Restrict role and is_banned columns

## Problem
The profiles UPDATE policy allows users to modify their own `role` and `is_banned` columns,
which is a privilege escalation risk — a user could set role='admin' or is_banned=false.

## Fix
Revoke UPDATE on `role` and `is_banned` columns from anon and authenticated roles.
These columns are only modified by admin actions (via the admin panel which uses the
authenticated role with admin check in RLS). Since column-level privileges override
table-level grants, this prevents non-admin users from escalating their role.

## Notes
- SELECT still works on all columns (needed for browse).
- INSERT still works (new users get default role='user', is_banned=false).
- Only the UPDATE on these two specific columns is blocked.
*/

REVOKE UPDATE (role, is_banned) ON profiles FROM anon;
REVOKE UPDATE (role, is_banned) ON profiles FROM authenticated;