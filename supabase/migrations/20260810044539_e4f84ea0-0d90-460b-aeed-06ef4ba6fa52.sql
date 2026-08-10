CREATE TABLE public.admin_2fa_challenges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  user_id uuid NOT NULL,
  code_hash text NOT NULL,
  expires_at timestamptz NOT NULL,
  attempts integer NOT NULL DEFAULT 0,
  sends integer NOT NULL DEFAULT 1,
  last_sent_at timestamptz NOT NULL DEFAULT now(),
  consumed_at timestamptz,
  grant_token text,
  grant_expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX admin_2fa_challenges_email_idx ON public.admin_2fa_challenges (email, created_at DESC);
GRANT ALL ON public.admin_2fa_challenges TO service_role;
ALTER TABLE public.admin_2fa_challenges ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.admin_2fa_verifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  verified_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL
);
CREATE INDEX admin_2fa_verifications_user_idx ON public.admin_2fa_verifications (user_id, expires_at DESC);
GRANT ALL ON public.admin_2fa_verifications TO service_role;
ALTER TABLE public.admin_2fa_verifications ENABLE ROW LEVEL SECURITY;