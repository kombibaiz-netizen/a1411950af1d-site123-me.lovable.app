
-- Pin search_path on the only function missing it
ALTER FUNCTION public.generate_referral_code() SET search_path = public;

-- Lock down SECURITY DEFINER functions: only signed-in users for app RPCs;
-- trigger function should not be callable from the API at all.
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.process_pending_withdrawals() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.generate_referral_code() FROM PUBLIC, anon, authenticated;

REVOKE ALL ON FUNCTION public.add_earning(TEXT, BIGINT, JSONB) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.add_earning(TEXT, BIGINT, JSONB) TO authenticated;

REVOKE ALL ON FUNCTION public.request_withdrawal(TEXT, TEXT, BIGINT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.request_withdrawal(TEXT, TEXT, BIGINT) TO authenticated;
