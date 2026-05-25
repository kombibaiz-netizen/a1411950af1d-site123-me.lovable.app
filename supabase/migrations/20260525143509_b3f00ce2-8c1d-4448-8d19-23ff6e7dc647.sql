
-- 1. Restrict profiles SELECT to owner only
DROP POLICY IF EXISTS "Profiles are viewable by authenticated users" ON public.profiles;
CREATE POLICY "Users view own profile"
ON public.profiles FOR SELECT TO authenticated
USING (auth.uid() = id);

-- 2. Remove direct INSERT on earnings (credits only via add_earning SECURITY DEFINER)
DROP POLICY IF EXISTS "Users insert own earnings" ON public.earnings;
REVOKE INSERT ON public.earnings FROM authenticated, anon;

-- 3. Lock down SECURITY DEFINER functions: revoke from anon, keep for authenticated where needed
REVOKE EXECUTE ON FUNCTION public.add_earning(text, bigint, jsonb) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.spend_sats(bigint, text, jsonb) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.request_withdrawal(text, text, bigint) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.process_pending_withdrawals() FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.generate_referral_code() FROM anon, public, authenticated;

GRANT EXECUTE ON FUNCTION public.add_earning(text, bigint, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.spend_sats(bigint, text, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.request_withdrawal(text, text, bigint) TO authenticated;
GRANT EXECUTE ON FUNCTION public.process_pending_withdrawals() TO authenticated;
