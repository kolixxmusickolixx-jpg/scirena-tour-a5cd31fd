-- 1. profile fields on admin_users
ALTER TABLE public.admin_users
  ADD COLUMN IF NOT EXISTS name text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS avatar_url text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS last_login_at timestamptz;

-- 2. activity log
CREATE TABLE IF NOT EXISTS public.activity_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id uuid,
  actor_name text NOT NULL DEFAULT '',
  actor_email text NOT NULL DEFAULT '',
  actor_role text NOT NULL DEFAULT '',
  action text NOT NULL,
  entity text NOT NULL DEFAULT '',
  object_id text NOT NULL DEFAULT '',
  object_label text NOT NULL DEFAULT '',
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.activity_log TO authenticated;
GRANT ALL ON public.activity_log TO service_role;
ALTER TABLE public.activity_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Full admins read activity log" ON public.activity_log;
CREATE POLICY "Full admins read activity log" ON public.activity_log
  FOR SELECT TO authenticated USING (public.is_full_admin());

CREATE INDEX IF NOT EXISTS activity_log_created_idx ON public.activity_log (created_at DESC);
CREATE INDEX IF NOT EXISTS activity_log_actor_idx ON public.activity_log (actor_id);

-- 3. writer used by triggers and RPCs
CREATE OR REPLACE FUNCTION public.write_activity(
  p_action text, p_entity text, p_object_id text, p_object_label text, p_details jsonb
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_uid uuid := auth.uid(); v_name text := ''; v_email text := ''; v_role text := '';
BEGIN
  SELECT coalesce(name,''), coalesce(email,''), coalesce(role,'')
    INTO v_name, v_email, v_role FROM public.admin_users WHERE user_id = v_uid;
  INSERT INTO public.activity_log (actor_id, actor_name, actor_email, actor_role, action, entity, object_id, object_label, details)
  VALUES (v_uid, coalesce(v_name,''), coalesce(v_email,''), coalesce(v_role,''),
          left(coalesce(p_action,''), 40), left(coalesce(p_entity,''), 40),
          left(coalesce(p_object_id,''), 64), left(coalesce(p_object_label,''), 200),
          coalesce(p_details, '{}'::jsonb));
END; $$;

CREATE OR REPLACE FUNCTION public.log_activity(
  p_action text, p_entity text DEFAULT '', p_object_id text DEFAULT '', p_object_label text DEFAULT '', p_details jsonb DEFAULT '{}'::jsonb
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NULL OR NOT EXISTS (SELECT 1 FROM public.admin_users WHERE user_id = auth.uid()) THEN
    RETURN jsonb_build_object('ok', false);
  END IF;
  PERFORM public.write_activity(p_action, p_entity, p_object_id, p_object_label, p_details);
  RETURN jsonb_build_object('ok', true);
END; $$;

-- 4. generic content-change trigger
CREATE OR REPLACE FUNCTION public.log_content_change() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_row jsonb; v_label text; v_id text; v_action text;
BEGIN
  IF TG_OP = 'DELETE' THEN v_row := to_jsonb(OLD); v_action := 'delete';
  ELSIF TG_OP = 'INSERT' THEN v_row := to_jsonb(NEW); v_action := 'create';
  ELSE v_row := to_jsonb(NEW); v_action := 'update'; END IF;

  v_label := coalesce(v_row->>'title', v_row->>'question', v_row->>'label',
                      nullif(concat_ws(' · ', v_row->>'city', v_row->>'venue'), ''),
                      v_row->>'key', '');
  v_id := coalesce(v_row->>'id', v_row->>'key', '');

  PERFORM public.write_activity(v_action, TG_TABLE_NAME, v_id, v_label, '{}'::jsonb);
  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END; $$;

DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['shows','faq_items','social_links','site_content','releases','gallery_albums','gallery_photos','media_items']
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS log_activity_trg ON public.%I', t);
    EXECUTE format('CREATE TRIGGER log_activity_trg AFTER INSERT OR UPDATE OR DELETE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.log_content_change()', t);
  END LOOP;
END $$;

CREATE OR REPLACE FUNCTION public.log_admin_change() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_action text; v_label text;
BEGIN
  IF TG_OP = 'INSERT' THEN v_action := 'admin_create'; v_label := NEW.email;
  ELSIF TG_OP = 'DELETE' THEN v_action := 'admin_delete'; v_label := OLD.email;
  ELSE
    v_label := NEW.email;
    IF NEW.role IS DISTINCT FROM OLD.role THEN v_action := 'admin_role';
    ELSIF NEW.active IS DISTINCT FROM OLD.active THEN v_action := CASE WHEN NEW.active THEN 'admin_activate' ELSE 'admin_deactivate' END;
    ELSIF NEW.name IS DISTINCT FROM OLD.name OR NEW.avatar_url IS DISTINCT FROM OLD.avatar_url THEN v_action := 'profile_update';
    ELSE RETURN NEW; END IF;
  END IF;
  PERFORM public.write_activity(v_action, 'admin_users',
    coalesce((CASE WHEN TG_OP = 'DELETE' THEN OLD.user_id ELSE NEW.user_id END)::text, ''), coalesce(v_label,''), '{}'::jsonb);
  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS log_admin_activity_trg ON public.admin_users;
CREATE TRIGGER log_admin_activity_trg AFTER INSERT OR UPDATE OR DELETE ON public.admin_users
  FOR EACH ROW EXECUTE FUNCTION public.log_admin_change();

-- 5. profile RPCs
CREATE OR REPLACE FUNCTION public.admin_update_profile(p_name text, p_avatar_url text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NULL THEN RETURN jsonb_build_object('ok', false, 'error', 'unauthorized'); END IF;
  UPDATE public.admin_users
     SET name = left(coalesce(p_name, ''), 80), avatar_url = left(coalesce(p_avatar_url, ''), 500), updated_at = now()
   WHERE user_id = auth.uid();
  RETURN jsonb_build_object('ok', true);
END; $$;

CREATE OR REPLACE FUNCTION public.admin_touch_login() RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NULL OR NOT EXISTS (SELECT 1 FROM public.admin_users WHERE user_id = auth.uid()) THEN
    RETURN jsonb_build_object('ok', false);
  END IF;
  UPDATE public.admin_users SET last_login_at = now() WHERE user_id = auth.uid();
  PERFORM public.write_activity('login', 'auth', auth.uid()::text, '', '{}'::jsonb);
  RETURN jsonb_build_object('ok', true);
END; $$;

-- 6. delete admin with guards
CREATE OR REPLACE FUNCTION public.admin_delete_user(p_user_id uuid) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_target public.admin_users%ROWTYPE; v_full_count int;
BEGIN
  IF NOT public.is_full_admin() THEN RETURN jsonb_build_object('ok', false, 'error', 'forbidden'); END IF;
  IF p_user_id = auth.uid() THEN RETURN jsonb_build_object('ok', false, 'error', 'self'); END IF;
  SELECT * INTO v_target FROM public.admin_users WHERE user_id = p_user_id;
  IF NOT FOUND THEN RETURN jsonb_build_object('ok', false, 'error', 'not_found'); END IF;
  IF v_target.role IN ('artist','organizer','developer') THEN
    SELECT count(*) INTO v_full_count FROM public.admin_users WHERE role IN ('artist','organizer','developer') AND active;
    IF v_full_count <= 1 THEN RETURN jsonb_build_object('ok', false, 'error', 'last_admin'); END IF;
  END IF;
  DELETE FROM public.admin_users WHERE user_id = p_user_id;
  RETURN jsonb_build_object('ok', true, 'email', v_target.email);
END; $$;

-- 7. name set by full admins
CREATE OR REPLACE FUNCTION public.admin_set_name(p_user_id uuid, p_name text) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.is_full_admin() THEN RETURN jsonb_build_object('ok', false, 'error', 'forbidden'); END IF;
  UPDATE public.admin_users SET name = left(coalesce(p_name,''), 80), updated_at = now() WHERE user_id = p_user_id;
  RETURN jsonb_build_object('ok', true);
END; $$;

-- 8. avatar storage policies (private bucket, signed URLs)
DROP POLICY IF EXISTS "Admins read avatars" ON storage.objects;
CREATE POLICY "Admins read avatars" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'avatars' AND public.admin_role() IS NOT NULL);
DROP POLICY IF EXISTS "Admins upload own avatar" ON storage.objects;
CREATE POLICY "Admins upload own avatar" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);
DROP POLICY IF EXISTS "Admins update own avatar" ON storage.objects;
CREATE POLICY "Admins update own avatar" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);
DROP POLICY IF EXISTS "Admins delete own avatar" ON storage.objects;
CREATE POLICY "Admins delete own avatar" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);