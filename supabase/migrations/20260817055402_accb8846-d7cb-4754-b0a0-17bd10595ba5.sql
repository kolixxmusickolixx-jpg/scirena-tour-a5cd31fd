CREATE OR REPLACE FUNCTION public.admin_upsert_user(p_user_id uuid, p_email text, p_role text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.is_full_admin() THEN
    RETURN jsonb_build_object('ok', false, 'error', 'forbidden');
  END IF;
  IF p_role NOT IN ('artist','organizer','developer','photographer','videographer') THEN
    RETURN jsonb_build_object('ok', false, 'error', 'bad_role');
  END IF;

  INSERT INTO public.admin_users (user_id, email, role, active, must_change_password)
  VALUES (p_user_id, lower(trim(p_email)), p_role, true, true)
  ON CONFLICT (user_id) DO UPDATE
    SET role = EXCLUDED.role, active = true, must_change_password = true,
        email = EXCLUDED.email, updated_at = now();

  RETURN jsonb_build_object('ok', true);
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_mark_temp_password(p_user_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.is_full_admin() THEN
    RETURN jsonb_build_object('ok', false, 'error', 'forbidden');
  END IF;
  UPDATE public.admin_users SET must_change_password = true, updated_at = now() WHERE user_id = p_user_id;
  RETURN jsonb_build_object('ok', true);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.admin_upsert_user(uuid, text, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.admin_mark_temp_password(uuid) FROM anon;