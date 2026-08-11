-- SUPPORT ------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.support_create_ticket(p_name text, p_email text, p_message text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_code text;
  v_row public.support_tickets%ROWTYPE;
BEGIN
  IF coalesce(length(trim(p_name)),0) < 2 OR p_email !~ '^[^\s@]+@[^\s@]+\.[^\s@]+$' OR coalesce(length(trim(p_message)),0) < 3 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'invalid_input');
  END IF;

  SELECT string_agg(substr('ABCDEFGHJKLMNPQRSTUVWXYZ23456789', 1 + floor(random()*32)::int, 1), '')
    INTO v_code FROM generate_series(1,6);

  INSERT INTO public.support_tickets (name, email, subject, status, access_code)
  VALUES (left(trim(p_name),80), lower(trim(p_email)), left(trim(p_message),90), 'new', v_code)
  RETURNING * INTO v_row;

  INSERT INTO public.support_messages (ticket_id, sender, body)
  VALUES (v_row.id, 'client', left(trim(p_message),4000));

  RETURN jsonb_build_object(
    'ok', true,
    'accessCode', v_code,
    'ticket', jsonb_build_object(
      'id', v_row.id, 'name', v_row.name, 'email', v_row.email, 'subject', v_row.subject,
      'status', v_row.status, 'created_at', v_row.created_at, 'updated_at', v_row.updated_at)
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.support_get_thread(p_ticket_id uuid, p_code text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_row public.support_tickets%ROWTYPE;
  v_messages jsonb;
BEGIN
  SELECT * INTO v_row FROM public.support_tickets WHERE id = p_ticket_id;
  IF NOT FOUND OR v_row.access_code IS DISTINCT FROM upper(trim(p_code)) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_found');
  END IF;

  SELECT coalesce(jsonb_agg(jsonb_build_object(
      'id', m.id, 'ticket_id', m.ticket_id, 'sender', m.sender, 'body', m.body, 'created_at', m.created_at
    ) ORDER BY m.created_at), '[]'::jsonb)
    INTO v_messages FROM public.support_messages m WHERE m.ticket_id = v_row.id;

  RETURN jsonb_build_object('ok', true, 'messages', v_messages, 'ticket', jsonb_build_object(
    'id', v_row.id, 'name', v_row.name, 'email', v_row.email, 'subject', v_row.subject,
    'status', v_row.status, 'created_at', v_row.created_at, 'updated_at', v_row.updated_at));
END;
$$;

CREATE OR REPLACE FUNCTION public.support_send_message(p_ticket_id uuid, p_code text, p_body text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_row public.support_tickets%ROWTYPE;
BEGIN
  SELECT * INTO v_row FROM public.support_tickets WHERE id = p_ticket_id;
  IF NOT FOUND OR v_row.access_code IS DISTINCT FROM upper(trim(p_code)) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_found');
  END IF;
  IF v_row.status = 'closed' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'closed');
  END IF;
  IF coalesce(length(trim(p_body)),0) < 1 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'empty');
  END IF;

  INSERT INTO public.support_messages (ticket_id, sender, body)
  VALUES (v_row.id, 'client', left(trim(p_body),4000));
  UPDATE public.support_tickets SET updated_at = now() WHERE id = v_row.id;
  RETURN jsonb_build_object('ok', true);
END;
$$;

CREATE OR REPLACE FUNCTION public.support_find_tickets(p_email text, p_code text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_list jsonb;
BEGIN
  SELECT coalesce(jsonb_agg(jsonb_build_object(
      'id', t.id, 'name', t.name, 'email', t.email, 'subject', t.subject, 'status', t.status,
      'created_at', t.created_at, 'updated_at', t.updated_at, 'accessCode', t.access_code
    ) ORDER BY t.created_at DESC), '[]'::jsonb)
  INTO v_list
  FROM public.support_tickets t
  WHERE t.email = lower(trim(p_email)) AND t.access_code = upper(trim(p_code));

  IF v_list = '[]'::jsonb THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_found');
  END IF;
  RETURN jsonb_build_object('ok', true, 'tickets', v_list);
END;
$$;

-- 2FA -----------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.twofa_create_challenge(
  p_id uuid, p_email text, p_user_id uuid, p_code_hash text,
  p_expires_at timestamptz, p_max_per_hour int)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_count int;
BEGIN
  SELECT count(*) INTO v_count FROM public.admin_2fa_challenges
   WHERE email = p_email AND created_at > now() - interval '1 hour';
  IF v_count >= p_max_per_hour THEN
    RETURN jsonb_build_object('ok', false, 'error', 'rate_limited');
  END IF;

  UPDATE public.admin_2fa_challenges SET consumed_at = now()
   WHERE user_id = p_user_id AND consumed_at IS NULL;

  INSERT INTO public.admin_2fa_challenges (id, email, user_id, code_hash, expires_at)
  VALUES (p_id, p_email, p_user_id, p_code_hash, p_expires_at);

  RETURN jsonb_build_object('ok', true);
END;
$$;

CREATE OR REPLACE FUNCTION public.twofa_resend(
  p_id uuid, p_code_hash text, p_expires_at timestamptz, p_cooldown_sec int, p_max_sends int)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_row public.admin_2fa_challenges%ROWTYPE; v_since numeric;
BEGIN
  SELECT * INTO v_row FROM public.admin_2fa_challenges WHERE id = p_id;
  IF NOT FOUND OR v_row.consumed_at IS NOT NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'expired');
  END IF;
  IF v_row.sends >= p_max_sends THEN
    RETURN jsonb_build_object('ok', false, 'error', 'send_limit');
  END IF;
  v_since := extract(epoch FROM (now() - v_row.last_sent_at));
  IF v_since < p_cooldown_sec THEN
    RETURN jsonb_build_object('ok', false, 'error', 'cooldown', 'waitSec', ceil(p_cooldown_sec - v_since));
  END IF;

  UPDATE public.admin_2fa_challenges
     SET code_hash = p_code_hash, attempts = 0, sends = sends + 1,
         last_sent_at = now(), expires_at = p_expires_at
   WHERE id = p_id;

  RETURN jsonb_build_object('ok', true, 'email', v_row.email);
END;
$$;

CREATE OR REPLACE FUNCTION public.twofa_verify(
  p_id uuid, p_code_hash text, p_max_attempts int, p_grant_token text, p_grant_ttl_sec int)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_row public.admin_2fa_challenges%ROWTYPE; v_attempts int;
BEGIN
  SELECT * INTO v_row FROM public.admin_2fa_challenges WHERE id = p_id;
  IF NOT FOUND OR v_row.consumed_at IS NOT NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'expired');
  END IF;
  IF v_row.expires_at < now() THEN
    UPDATE public.admin_2fa_challenges SET consumed_at = now() WHERE id = p_id;
    RETURN jsonb_build_object('ok', false, 'error', 'code_expired');
  END IF;
  IF v_row.attempts >= p_max_attempts THEN
    UPDATE public.admin_2fa_challenges SET consumed_at = now() WHERE id = p_id;
    RETURN jsonb_build_object('ok', false, 'error', 'too_many');
  END IF;

  IF v_row.code_hash IS DISTINCT FROM p_code_hash THEN
    UPDATE public.admin_2fa_challenges SET attempts = attempts + 1 WHERE id = p_id
      RETURNING attempts INTO v_attempts;
    RETURN jsonb_build_object('ok', false, 'error', 'wrong_code',
      'attemptsLeft', greatest(0, p_max_attempts - v_attempts));
  END IF;

  UPDATE public.admin_2fa_challenges
     SET consumed_at = now(), grant_token = p_grant_token,
         grant_expires_at = now() + make_interval(secs => p_grant_ttl_sec)
   WHERE id = p_id;

  RETURN jsonb_build_object('ok', true);
END;
$$;

CREATE OR REPLACE FUNCTION public.twofa_claim_grant(p_grant_token text, p_ttl_hours int)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_row public.admin_2fa_challenges%ROWTYPE; v_uid uuid := auth.uid();
BEGIN
  IF v_uid IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'unauthorized');
  END IF;
  SELECT * INTO v_row FROM public.admin_2fa_challenges WHERE grant_token = p_grant_token;
  IF NOT FOUND OR v_row.user_id <> v_uid THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_found');
  END IF;
  IF v_row.grant_expires_at IS NULL OR v_row.grant_expires_at < now() THEN
    RETURN jsonb_build_object('ok', false, 'error', 'expired');
  END IF;

  UPDATE public.admin_2fa_challenges SET grant_token = NULL, grant_expires_at = NULL WHERE id = v_row.id;
  INSERT INTO public.admin_2fa_verifications (user_id, expires_at)
  VALUES (v_uid, now() + make_interval(hours => p_ttl_hours));

  RETURN jsonb_build_object('ok', true);
END;
$$;

CREATE OR REPLACE FUNCTION public.twofa_is_verified()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.admin_2fa_verifications
     WHERE user_id = auth.uid() AND expires_at > now()
  );
$$;

CREATE OR REPLACE FUNCTION public.twofa_revoke()
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  DELETE FROM public.admin_2fa_verifications WHERE user_id = auth.uid();
$$;

-- Execute grants -------------------------------------------------------------

GRANT EXECUTE ON FUNCTION public.support_create_ticket(text, text, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.support_get_thread(uuid, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.support_send_message(uuid, text, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.support_find_tickets(text, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.twofa_create_challenge(uuid, text, uuid, text, timestamptz, int) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.twofa_resend(uuid, text, timestamptz, int, int) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.twofa_verify(uuid, text, int, text, int) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.twofa_claim_grant(text, int) TO authenticated;
GRANT EXECUTE ON FUNCTION public.twofa_is_verified() TO authenticated;
GRANT EXECUTE ON FUNCTION public.twofa_revoke() TO authenticated;