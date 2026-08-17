REVOKE EXECUTE ON FUNCTION public.admin_role() FROM anon;
REVOKE EXECUTE ON FUNCTION public.is_full_admin() FROM anon;
REVOKE EXECUTE ON FUNCTION public.can_manage(text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.admin_me() FROM anon;
REVOKE EXECUTE ON FUNCTION public.admin_password_changed() FROM anon;
REVOKE EXECUTE ON FUNCTION public.claim_admin() FROM anon;