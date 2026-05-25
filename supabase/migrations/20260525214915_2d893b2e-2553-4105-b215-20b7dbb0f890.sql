
-- 1. Profiles: restrict UPDATE to safe columns only
DROP POLICY IF EXISTS "Users update own profile" ON public.profiles;
REVOKE UPDATE ON public.profiles FROM authenticated, anon;
GRANT UPDATE (username, avatar_url, updated_at) ON public.profiles TO authenticated;
CREATE POLICY "Users update own profile safe cols"
  ON public.profiles FOR UPDATE TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- 2. Withdrawals: drop direct insert policy, revoke insert
DROP POLICY IF EXISTS "Users insert own withdrawals" ON public.withdrawals;
REVOKE INSERT ON public.withdrawals FROM authenticated, anon;

-- 3. add_earning: enforce source allow-list + per-source daily caps
CREATE OR REPLACE FUNCTION public.add_earning(p_source text, p_amount bigint, p_metadata jsonb DEFAULT '{}'::jsonb)
 RETURNS bigint
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  new_balance BIGINT;
  daily_total BIGINT;
  daily_cap BIGINT;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF p_amount <= 0 OR p_amount > 10000 THEN RAISE EXCEPTION 'Invalid amount'; END IF;

  -- Allow-list of valid sources with per-day caps (in sats)
  daily_cap := CASE p_source
    WHEN 'ad_view'   THEN 5000
    WHEN 'watch'     THEN 5000
    WHEN 'scroll'    THEN 2000
    WHEN 'reels'     THEN 3000
    WHEN 'mining'    THEN 20000
    WHEN 'chat'      THEN 500
    WHEN 'daily'     THEN 100
    WHEN 'referral'  THEN 100000
    ELSE NULL
  END;

  IF daily_cap IS NULL THEN
    RAISE EXCEPTION 'Invalid earning source: %', p_source;
  END IF;

  -- Enforce per-source daily cap
  SELECT COALESCE(SUM(amount_sats), 0) INTO daily_total
  FROM public.earnings
  WHERE user_id = auth.uid()
    AND source = p_source
    AND amount_sats > 0
    AND created_at >= date_trunc('day', now());

  IF daily_total + p_amount > daily_cap THEN
    RAISE EXCEPTION 'Daily limit reached for %', p_source;
  END IF;

  -- Special-case: daily check-in only once per day
  IF p_source = 'daily' THEN
    IF EXISTS (
      SELECT 1 FROM public.earnings
      WHERE user_id = auth.uid()
        AND source = 'daily'
        AND created_at >= date_trunc('day', now())
    ) THEN
      RAISE EXCEPTION 'Daily check-in already claimed';
    END IF;
  END IF;

  INSERT INTO public.earnings (user_id, source, amount_sats, metadata)
  VALUES (auth.uid(), p_source, p_amount, p_metadata);

  UPDATE public.profiles SET sats_balance = sats_balance + p_amount, updated_at = now()
  WHERE id = auth.uid()
  RETURNING sats_balance INTO new_balance;

  RETURN new_balance;
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.add_earning(text, bigint, jsonb) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.add_earning(text, bigint, jsonb) TO authenticated;
