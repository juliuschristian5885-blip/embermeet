/*
# Add Trust & Safety Columns to Profiles

## Summary
Adds two new columns to the `profiles` table to support trust and safety features:
- `twofa_enabled` — allows users to opt in to two-factor authentication
- `deletion_requested_at` — tracks when a user requested account deletion, for privacy compliance

## Modified Tables
- `profiles`
  - `twofa_enabled` (boolean, NOT NULL, default false) — whether the user has enabled 2FA
  - `deletion_requested_at` (timestamptz, nullable) — timestamp of account deletion request; NULL means no request

## Security
- No changes to existing RLS policies. The existing UPDATE policy `profiles_update_own_safe_columns`
  already allows users to update any column except `role` and `is_banned` (which are protected by
  WITH CHECK constraints). Both new columns are user-editable by design.
- `twofa_enabled` is a user preference — the user controls whether they want 2FA.
- `deletion_requested_at` is set by the user to request deletion; admins review and act on it.

## Important Notes
1. Both columns use `IF NOT EXISTS` guards via DO blocks for idempotency.
2. No data loss — existing rows get sensible defaults (false for 2FA, NULL for deletion).
3. The existing UPDATE policy's WITH CHECK only protects `role` and `is_banned`, so these new
   columns are safely editable by their owner.
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'twofa_enabled'
  ) THEN
    ALTER TABLE profiles ADD COLUMN twofa_enabled boolean NOT NULL DEFAULT false;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'deletion_requested_at'
  ) THEN
    ALTER TABLE profiles ADD COLUMN deletion_requested_at timestamptz;
  END IF;
END $$;
