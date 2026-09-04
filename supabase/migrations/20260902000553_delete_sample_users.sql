/*
# Delete Sample Users

## Summary
Removes 5 fake/sample users from the platform, keeping only admin@ember.com and davidpatricklucaz@gmail.com.

## Changes
- Deletes profiles for: sophia@ember.com, marcus@ember.com, elena@ember.com, james@ember.com, juliuschristian5885@gmail.com
- Cascading foreign keys will automatically delete their photos, messages, and reports
- Deletes the corresponding auth.users accounts for these emails
- Existing photos for deleted users are removed via ON DELETE CASCADE on photos.user_id

## Important Notes
1. The admin account (admin@ember.com) and the real user (davidpatricklucaz@gmail.com) are preserved.
2. Messages and reports referencing deleted users are removed via ON DELETE CASCADE.
3. This migration is safe to re-run — it only targets specific email addresses.
*/

DELETE FROM profiles WHERE email IN (
  'sophia@ember.com',
  'marcus@ember.com',
  'elena@ember.com',
  'james@ember.com',
  'juliuschristian5885@gmail.com'
);

DELETE FROM auth.users WHERE email IN (
  'sophia@ember.com',
  'marcus@ember.com',
  'elena@ember.com',
  'james@ember.com',
  'juliuschristian5885@gmail.com'
);
