CREATE TABLE public.partners (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  company_name text NOT NULL,
  contact_email text NOT NULL,
  partnership_type text NOT NULL,
  monthly_budget_usd integer NOT NULL DEFAULT 0,
  message text,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.partners ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own partner apps" ON public.partners
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users insert own partner apps" ON public.partners
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
