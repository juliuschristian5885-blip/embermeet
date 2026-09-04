/*
# Fix: Properly restrict admin_toggle_ban execution

PUBLIC role still had EXECUTE (default for new functions). Need to:
1. REVOKE EXECUTE FROM PUBLIC (removes from anon + everyone)
2. GRANT EXECUTE TO authenticated only
*/

REVOKE EXECUTE ON FUNCTION admin_toggle_ban(uuid, boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION admin_toggle_ban(uuid, boolean) TO authenticated;