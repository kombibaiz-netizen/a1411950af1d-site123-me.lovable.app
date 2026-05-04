CREATE OR REPLACE FUNCTION public.spend_sats(p_amount bigint, p_reason text, p_metadata jsonb DEFAULT '{}'::jsonb)
RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  current_balance BIGINT;
  new_balance BIGINT;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF p_amount <= 0 THEN RAISE EXCEPTION 'Invalid amount'; END IF;

  SELECT sats_balance INTO current_balance FROM public.profiles WHERE id = auth.uid() FOR UPDATE;
  IF current_balance < p_amount THEN RAISE EXCEPTION 'Insufficient balance'; END IF;

  UPDATE public.profiles SET sats_balance = sats_balance - p_amount, updated_at = now()
  WHERE id = auth.uid()
  RETURNING sats_balance INTO new_balance;

  INSERT INTO public.earnings (user_id, source, amount_sats, metadata)
  VALUES (auth.uid(), 'spend:' || p_reason, -p_amount, p_metadata);

  RETURN new_balance;
END;
$$;