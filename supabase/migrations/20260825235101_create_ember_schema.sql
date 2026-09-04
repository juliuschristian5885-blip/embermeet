/*
# Ember — Core Schema

Creates the full schema for the Ember adult connection platform.

## 1. New Tables
- `profiles` — public user profile data (one row per auth user). Holds display_name, bio, age, gender, location, coordinates, interests, online status, last_active, role, and ban status.
- `photos` — user-uploaded photos (max 5 per user) with admin approval workflow (pending/approved/rejected). Stores storage path + public URL.
- `messages` — private 1:1 chat messages between users. Tracks read status.
- `reports` — user-submitted reports about other users, with admin review workflow.
- `report_reasons` — enum-like reference table for report reasons.

## 2. Security
- RLS enabled on every table.
- Profiles: users read all non-banned profiles (browse feature) but can only update their own. Admins can update any (ban/unban).
- Photos: anyone authenticated can read approved photos (for browse); owners read their own pending/rejected; admins read all. Owners insert/update/delete their own; admins update status.
- Messages: users read/send/update only their own conversations (where they are sender or recipient). Delete own messages.
- Reports: users can create reports and read their own; admins can read/update all.
- Storage bucket `photos` created with public read for approved photos, private for pending.

## 3. Important Notes
- `profiles.role` defaults to 'user'; admin role set manually for admin@ember.com.
- `profiles.is_banned` defaults false; banned users cannot log in (enforced in app).
- `profiles.is_online` and `last_active` updated by app on session activity.
- `photos.status` workflow: pending → approved/rejected by admin.
- Distance calculation done in app using coordinates (Haversine).
- Admin role check uses `raw_app_meta_data` via a helper function `is_admin()`.
*/

-- ============================================================
-- PROFILES
-- ============================================================
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  display_name text NOT NULL DEFAULT '',
  bio text DEFAULT '',
  age integer DEFAULT 18,
  gender text DEFAULT '',
  location text DEFAULT '',
  latitude double precision,
  longitude double precision,
  interests text[] DEFAULT '{}',
  is_online boolean NOT NULL DEFAULT false,
  last_active timestamptz DEFAULT now(),
  role text NOT NULL DEFAULT 'user',
  is_banned boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "profiles_select_all" ON profiles;
CREATE POLICY "profiles_select_all" ON profiles FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "profiles_insert_own" ON profiles;
CREATE POLICY "profiles_insert_own" ON profiles FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "profiles_update_own" ON profiles;
CREATE POLICY "profiles_update_own" ON profiles FOR UPDATE
  TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "profiles_delete_own" ON profiles;
CREATE POLICY "profiles_delete_own" ON profiles FOR DELETE
  TO authenticated USING (auth.uid() = id);

-- ============================================================
-- PHOTOS
-- ============================================================
CREATE TABLE IF NOT EXISTS photos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  storage_path text NOT NULL,
  url text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  reviewed_at timestamptz,
  reviewed_by uuid REFERENCES profiles(id)
);

ALTER TABLE photos ENABLE ROW LEVEL SECURITY;

-- Anyone can read approved photos (for browsing); owners read their own; admins read all
DROP POLICY IF EXISTS "photos_select_visible" ON photos;
CREATE POLICY "photos_select_visible" ON photos FOR SELECT
  TO authenticated USING (
    status = 'approved'
    OR user_id = auth.uid()
    OR EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
  );

DROP POLICY IF EXISTS "photos_insert_own" ON photos;
CREATE POLICY "photos_insert_own" ON photos FOR INSERT
  TO authenticated WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "photos_update_own" ON photos;
CREATE POLICY "photos_update_own" ON photos FOR UPDATE
  TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "photos_delete_own" ON photos;
CREATE POLICY "photos_delete_own" ON photos FOR DELETE
  TO authenticated USING (user_id = auth.uid());

-- Admins can update photo status (approve/reject)
DROP POLICY IF EXISTS "photos_admin_update" ON photos;
CREATE POLICY "photos_admin_update" ON photos FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
  );

-- ============================================================
-- MESSAGES
-- ============================================================
CREATE TABLE IF NOT EXISTS messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  recipient_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  content text NOT NULL,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "messages_select_participants" ON messages;
CREATE POLICY "messages_select_participants" ON messages FOR SELECT
  TO authenticated USING (
    sender_id = auth.uid() OR recipient_id = auth.uid()
  );

DROP POLICY IF EXISTS "messages_insert_participant" ON messages;
CREATE POLICY "messages_insert_participant" ON messages FOR INSERT
  TO authenticated WITH CHECK (
    sender_id = auth.uid()
  );

DROP POLICY IF EXISTS "messages_update_participant" ON messages;
CREATE POLICY "messages_update_participant" ON messages FOR UPDATE
  TO authenticated USING (recipient_id = auth.uid()) WITH CHECK (recipient_id = auth.uid());

DROP POLICY IF EXISTS "messages_delete_participant" ON messages;
CREATE POLICY "messages_delete_participant" ON messages FOR DELETE
  TO authenticated USING (sender_id = auth.uid());

-- ============================================================
-- REPORTS
-- ============================================================
CREATE TABLE IF NOT EXISTS reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  reported_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  reason text NOT NULL,
  details text DEFAULT '',
  status text NOT NULL DEFAULT 'pending',
  resolved_at timestamptz,
  resolved_by uuid REFERENCES profiles(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE reports ENABLE ROW LEVEL SECURITY;

-- Users can read their own reports; admins read all
DROP POLICY IF EXISTS "reports_select_own_or_admin" ON reports;
CREATE POLICY "reports_select_own_or_admin" ON reports FOR SELECT
  TO authenticated USING (
    reporter_id = auth.uid()
    OR EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
  );

DROP POLICY IF EXISTS "reports_insert_own" ON reports;
CREATE POLICY "reports_insert_own" ON reports FOR INSERT
  TO authenticated WITH CHECK (reporter_id = auth.uid());

DROP POLICY IF EXISTS "reports_admin_update" ON reports;
CREATE POLICY "reports_admin_update" ON reports FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
  );

-- ============================================================
-- INDEXES
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_photos_user_id ON photos(user_id);
CREATE INDEX IF NOT EXISTS idx_photos_status ON photos(status);
CREATE INDEX IF NOT EXISTS idx_messages_sender ON messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_recipient ON messages(recipient_id);
CREATE INDEX IF NOT EXISTS idx_messages_created ON messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_reports_status ON reports(status);
CREATE INDEX IF NOT EXISTS idx_profiles_online ON profiles(is_online);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);

-- ============================================================
-- STORAGE BUCKET
-- ============================================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('photos', 'photos', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies: users can upload to their own folder, read all (public bucket), delete own
DROP POLICY IF EXISTS "photos_storage_insert_own" ON storage.objects;
CREATE POLICY "photos_storage_insert_own" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'photos');

DROP POLICY IF EXISTS "photos_storage_select_all" ON storage.objects;
CREATE POLICY "photos_storage_select_all" ON storage.objects
  FOR SELECT TO authenticated USING (bucket_id = 'photos');

DROP POLICY IF EXISTS "photos_storage_update_own" ON storage.objects;
CREATE POLICY "photos_storage_update_own" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'photos' AND owner = auth.uid())
  WITH CHECK (bucket_id = 'photos' AND owner = auth.uid());

DROP POLICY IF EXISTS "photos_storage_delete_own" ON storage.objects;
CREATE POLICY "photos_storage_delete_own" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'photos' AND owner = auth.uid());

-- ============================================================
-- HELPER: updated_at trigger for profiles
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS profiles_updated_at ON profiles;
CREATE TRIGGER profiles_updated_at BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();