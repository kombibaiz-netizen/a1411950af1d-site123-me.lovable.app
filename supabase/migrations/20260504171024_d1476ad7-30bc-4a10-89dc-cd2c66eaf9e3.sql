
-- Profiles
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE,
  avatar_url TEXT,
  sats_balance BIGINT NOT NULL DEFAULT 0,
  referral_code TEXT UNIQUE NOT NULL,
  referred_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Profiles are viewable by authenticated users" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users update own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id);
CREATE POLICY "Users insert own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);

-- Earnings log
CREATE TABLE public.earnings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  source TEXT NOT NULL, -- scroll | chat | watch | mining | referral | bonus
  amount_sats BIGINT NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.earnings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own earnings" ON public.earnings FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users insert own earnings" ON public.earnings FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE INDEX earnings_user_created_idx ON public.earnings(user_id, created_at DESC);

-- Withdrawals
CREATE TABLE public.withdrawals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  method TEXT NOT NULL, -- bitcoin | lightning | orange_money | mobile_money | paypal | binance
  destination TEXT NOT NULL,
  amount_sats BIGINT NOT NULL CHECK (amount_sats > 0),
  status TEXT NOT NULL DEFAULT 'pending', -- pending | processing | completed | failed
  process_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '1 minute'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ
);
ALTER TABLE public.withdrawals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own withdrawals" ON public.withdrawals FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users insert own withdrawals" ON public.withdrawals FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE INDEX withdrawals_user_idx ON public.withdrawals(user_id, created_at DESC);

-- Generate referral code helper
CREATE OR REPLACE FUNCTION public.generate_referral_code()
RETURNS TEXT LANGUAGE plpgsql AS $$
DECLARE
  code TEXT;
BEGIN
  LOOP
    code := upper(substring(md5(random()::text || clock_timestamp()::text) for 8));
    EXIT WHEN NOT EXISTS (SELECT 1 FROM public.profiles WHERE referral_code = code);
  END LOOP;
  RETURN code;
END;
$$;

-- Auto-create profile on signup; honor referral code in raw_user_meta_data
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  ref_code TEXT;
  inviter_id UUID;
BEGIN
  ref_code := NEW.raw_user_meta_data->>'referral_code';
  IF ref_code IS NOT NULL THEN
    SELECT id INTO inviter_id FROM public.profiles WHERE referral_code = ref_code;
  END IF;

  INSERT INTO public.profiles (id, username, referral_code, referred_by)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1)),
    public.generate_referral_code(),
    inviter_id
  );

  -- Reward both parties for referral signup
  IF inviter_id IS NOT NULL THEN
    INSERT INTO public.earnings (user_id, source, amount_sats) VALUES (NEW.id, 'referral', 500);
    UPDATE public.profiles SET sats_balance = sats_balance + 500 WHERE id = NEW.id;

    INSERT INTO public.earnings (user_id, source, amount_sats, metadata)
    VALUES (inviter_id, 'referral', 1000, jsonb_build_object('invitee', NEW.id));
    UPDATE public.profiles SET sats_balance = sats_balance + 1000 WHERE id = inviter_id;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Atomic earn function
CREATE OR REPLACE FUNCTION public.add_earning(p_source TEXT, p_amount BIGINT, p_metadata JSONB DEFAULT '{}'::jsonb)
RETURNS BIGINT LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  new_balance BIGINT;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF p_amount <= 0 OR p_amount > 10000 THEN RAISE EXCEPTION 'Invalid amount'; END IF;

  INSERT INTO public.earnings (user_id, source, amount_sats, metadata)
  VALUES (auth.uid(), p_source, p_amount, p_metadata);

  UPDATE public.profiles SET sats_balance = sats_balance + p_amount, updated_at = now()
  WHERE id = auth.uid()
  RETURNING sats_balance INTO new_balance;

  RETURN new_balance;
END;
$$;

-- Withdrawal request function (debits balance immediately)
CREATE OR REPLACE FUNCTION public.request_withdrawal(p_method TEXT, p_destination TEXT, p_amount BIGINT)
RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  current_balance BIGINT;
  withdrawal_id UUID;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF p_amount < 1000 THEN RAISE EXCEPTION 'Minimum withdrawal is 1000 sats'; END IF;

  SELECT sats_balance INTO current_balance FROM public.profiles WHERE id = auth.uid() FOR UPDATE;
  IF current_balance < p_amount THEN RAISE EXCEPTION 'Insufficient balance'; END IF;

  UPDATE public.profiles SET sats_balance = sats_balance - p_amount WHERE id = auth.uid();

  INSERT INTO public.withdrawals (user_id, method, destination, amount_sats)
  VALUES (auth.uid(), p_method, p_destination, p_amount)
  RETURNING id INTO withdrawal_id;

  RETURN withdrawal_id;
END;
$$;

-- Auto-complete pending withdrawals after 1 minute
CREATE OR REPLACE FUNCTION public.process_pending_withdrawals()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.withdrawals
  SET status = 'completed', completed_at = now()
  WHERE status = 'pending' AND process_at <= now();
END;
$$;
