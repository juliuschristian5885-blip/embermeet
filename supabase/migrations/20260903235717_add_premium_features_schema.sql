/*
# Embermeet Premium Features Schema

## Overview
Adds support for eight premium features: profile completion, who liked me,
who viewed me, icebreaker messages, online counter, location-based discovery,
advanced search filters, and verification badges.

## 1. New Columns on `profiles`
- `height` (integer, nullable) — user height in cm, for advanced search
- `body_type` (text, nullable) — e.g. slim, athletic, average, curvy
- `relationship_status` (text, nullable) — e.g. single, divorced, separated, widowed
- `smoking` (text, nullable) — e.g. never, socially, regularly
- `drinking` (text, nullable) — e.g. never, socially, regularly
- `is_verified` (boolean, default false) — email verification badge

## 2. New Table: `likes`
Tracks when one user likes/favorites another user's profile.
- `id` (uuid, primary key)
- `liker_id` (uuid, FK → profiles.id) — who liked
- `liked_id` (uuid, FK → profiles.id) — who was liked
- `created_at` (timestamptz)
- Unique constraint on (liker_id, liked_id) to prevent duplicate likes

## 3. New Table: `profile_views`
Tracks when one user views another user's profile.
- `id` (uuid, primary key)
- `viewer_id` (uuid, FK → profiles.id) — who viewed
- `viewed_id` (uuid, FK → profiles.id) — who was viewed
- `created_at` (timestamptz)
- Unique constraint on (viewer_id, viewed_id) to prevent duplicate view records

## 4. Security
- RLS enabled on `likes` and `profile_views`.
- `likes`: users can insert their own likes, delete their own likes,
  and read likes where they are the liked_id (to see who liked them).
  Also allows reading own outgoing likes (to check if already liked).
- `profile_views`: users can insert their own views, and read views
  where they are the viewed_id (to see who viewed them).
- All policies scoped to `authenticated` since the app requires sign-in.

## 5. Indexes
- `idx_likes_liked_id` — fast lookup of who liked a user
- `idx_likes_liker_id` — fast lookup of who a user has liked
- `idx_profile_views_viewed_id` — fast lookup of who viewed a user
- `idx_profile_views_viewer_id` — fast lookup of who a user has viewed
*/

-- ============================================================
-- ADD COLUMNS TO profiles
-- ============================================================
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'height') THEN
    ALTER TABLE profiles ADD COLUMN height integer;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'body_type') THEN
    ALTER TABLE profiles ADD COLUMN body_type text;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'relationship_status') THEN
    ALTER TABLE profiles ADD COLUMN relationship_status text;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'smoking') THEN
    ALTER TABLE profiles ADD COLUMN smoking text;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'drinking') THEN
    ALTER TABLE profiles ADD COLUMN drinking text;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'is_verified') THEN
    ALTER TABLE profiles ADD COLUMN is_verified boolean NOT NULL DEFAULT false;
  END IF;
END $$;

-- ============================================================
-- LIKES TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS likes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  liker_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  liked_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (liker_id, liked_id)
);

ALTER TABLE likes ENABLE ROW LEVEL SECURITY;

-- Users can read likes they sent or received
DROP POLICY IF EXISTS "likes_select_own" ON likes;
CREATE POLICY "likes_select_own" ON likes FOR SELECT
  TO authenticated USING (
    liker_id = auth.uid() OR liked_id = auth.uid()
  );

-- Users can insert likes where they are the liker
DROP POLICY IF EXISTS "likes_insert_own" ON likes;
CREATE POLICY "likes_insert_own" ON likes FOR INSERT
  TO authenticated WITH CHECK (liker_id = auth.uid());

-- Users can delete their own likes (unlike)
DROP POLICY IF EXISTS "likes_delete_own" ON likes;
CREATE POLICY "likes_delete_own" ON likes FOR DELETE
  TO authenticated USING (liker_id = auth.uid());

-- ============================================================
-- PROFILE_VIEWS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS profile_views (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  viewer_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  viewed_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (viewer_id, viewed_id)
);

ALTER TABLE profile_views ENABLE ROW LEVEL SECURITY;

-- Users can read views of their own profile (who viewed me)
-- Also allows reading own outgoing views (to check if already viewed)
DROP POLICY IF EXISTS "profile_views_select_own" ON profile_views;
CREATE POLICY "profile_views_select_own" ON profile_views FOR SELECT
  TO authenticated USING (
    viewer_id = auth.uid() OR viewed_id = auth.uid()
  );

-- Users can insert views where they are the viewer
DROP POLICY IF EXISTS "profile_views_insert_own" ON profile_views;
CREATE POLICY "profile_views_insert_own" ON profile_views FOR INSERT
  TO authenticated WITH CHECK (viewer_id = auth.uid());

-- Users can update views where they are the viewer (update timestamp on re-view)
DROP POLICY IF EXISTS "profile_views_update_own" ON profile_views;
CREATE POLICY "profile_views_update_own" ON profile_views FOR UPDATE
  TO authenticated USING (viewer_id = auth.uid()) WITH CHECK (viewer_id = auth.uid());

-- ============================================================
-- INDEXES
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_likes_liked_id ON likes(liked_id);
CREATE INDEX IF NOT EXISTS idx_likes_liker_id ON likes(liker_id);
CREATE INDEX IF NOT EXISTS idx_profile_views_viewed_id ON profile_views(viewed_id);
CREATE INDEX IF NOT EXISTS idx_profile_views_viewer_id ON profile_views(viewer_id);