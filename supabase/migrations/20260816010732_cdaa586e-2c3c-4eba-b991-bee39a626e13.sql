
REVOKE EXECUTE ON FUNCTION public.next_quote_number() FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.next_invoice_number() FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.sync_invoice_balance() FROM anon, public, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon, public, authenticated;
REVOKE EXECUTE ON FUNCTION public.touch_updated_at() FROM anon, public, authenticated;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.next_quote_number() TO authenticated;
GRANT EXECUTE ON FUNCTION public.next_invoice_number() TO authenticated;
