/*
# Create Blocked Users Table

## Summary
Adds a `blocked_users` table so users can block other users. Blocked users are hidden from the blocker's browse results and cannot send messages to the blocker.

## New Tables
- `blocked_users`
  - `id` (uuid, primary key)
  - `blocker_id` (uuid, not null, references profiles.id via auth.users, the user doing the blocking)
  - `blocked_id` (uuid, not null, references profiles.id via auth.users, the user being blocked)
  - `created_at` (timestamptz, default now())
  - Unique constraint on (blocker_id, blocked_id) to prevent duplicate blocks

## Security
- RLS enabled on `blocked_users`.
- Users can only see, create, and delete their own blocks (where blocker_id = auth.uid()).
- Four separate policies for SELECT, INSERT, UPDATE, DELETE.

## Important Notes
1. The blocker_id column defaults to auth.uid() so inserts from the client don't need to pass it.
2. A user cannot block themselves (CHECK constraint).
3. The unique constraint prevents duplicate block entries.
*/

CREATE TABLE IF NOT EXISTS blocked_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  blocker_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  blocked_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE (blocker_id, blocked_id),
  CHECK (blocker_id != blocked_id)
);

ALTER TABLE blocked_users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_blocks" ON blocked_users;
CREATE POLICY "select_own_blocks" ON blocked_users FOR SELECT
  TO authenticated USING (auth.uid() = blocker_id);

DROP POLICY IF EXISTS "insert_own_blocks" ON blocked_users;
CREATE POLICY "insert_own_blocks" ON blocked_users FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = blocker_id);

DROP POLICY IF EXISTS "update_own_blocks" ON blocked_users;
CREATE POLICY "update_own_blocks" ON blocked_users FOR UPDATE
  TO authenticated USING (auth.uid() = blocker_id) WITH CHECK (auth.uid() = blocker_id);

DROP POLICY IF EXISTS "delete_own_blocks" ON blocked_users;
CREATE POLICY "delete_own_blocks" ON blocked_users FOR DELETE
  TO authenticated USING (auth.uid() = blocker_id);
