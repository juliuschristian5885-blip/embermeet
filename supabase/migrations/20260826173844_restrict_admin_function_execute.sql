/*
# Fix: Restrict admin_toggle_ban execution to authenticated only

The security advisor flagged that admin_toggle_ban is callable by the anon role.
While the function body checks for admin role internally, we should follow least
privilege and revoke EXECUTE from anon. The function already checks admin role
internally so authenticated-only is correct — non-admins get an error response.
*/

REVOKE EXECUTE ON FUNCTION admin_toggle_ban(uuid, boolean) FROM anon;