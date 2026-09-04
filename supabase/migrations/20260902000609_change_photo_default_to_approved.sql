/*
# Change Photo Default Status to Approved

## Summary
Changes the default status of newly uploaded photos from 'pending' to 'approved' so they are visible to other users immediately. Admins can still moderate photos later via the Admin Panel.

## Changes
- Alters the `photos.status` column default from `'pending'` to `'approved'`.
- Updates all existing photos with status 'pending' to 'approved' so any currently-waiting photos become visible.

## Important Notes
1. New photos uploaded by users will now be visible to others immediately upon upload.
2. The admin can still reject a photo by setting its status to 'rejected' — the RLS policy already hides non-approved photos from other users.
3. The Admin Panel Photos tab will be updated in the frontend to show all photos (not just pending), so admins can moderate after the fact.
*/

ALTER TABLE photos ALTER COLUMN status SET DEFAULT 'approved';

UPDATE photos SET status = 'approved' WHERE status = 'pending';
