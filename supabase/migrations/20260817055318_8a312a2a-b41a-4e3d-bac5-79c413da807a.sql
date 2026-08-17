-- 1. Admin users table (roles + activation + temp password flag)
CREATE TABLE public.admin_users (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  role text NOT NULL DEFAULT 'organizer',
  active boolean NOT NULL DEFAULT true,
  must_change_password boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT admin_users_role_check CHECK (role IN ('artist','organizer','developer','photographer','videographer'))
);

GRANT SELECT, UPDATE ON public.admin_users TO authenticated;
GRANT ALL ON public.admin_users TO service_role;
ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER admin_users_updated_at BEFORE UPDATE ON public.admin_users
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 2. Permission helpers
CREATE OR REPLACE FUNCTION public.admin_role()
RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT role FROM public.admin_users WHERE user_id = auth.uid() AND active
$$;

CREATE OR REPLACE FUNCTION public.is_full_admin()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT coalesce(public.admin_role() IN ('artist','organizer','developer'), false)
$$;

CREATE OR REPLACE FUNCTION public.can_manage(_section text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT CASE
    WHEN public.admin_role() IS NULL THEN false
    WHEN public.admin_role() IN ('artist','organizer','developer') THEN true
    WHEN _section = 'gallery' THEN public.admin_role() = 'photographer'
    WHEN _section = 'media' THEN public.admin_role() = 'videographer'
    ELSE false
  END
$$;

CREATE OR REPLACE FUNCTION public.admin_me()
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT coalesce(
    (SELECT jsonb_build_object('role', role, 'active', active, 'mustChangePassword', must_change_password, 'email', email)
       FROM public.admin_users WHERE user_id = auth.uid()),
    '{}'::jsonb)
$$;

CREATE OR REPLACE FUNCTION public.admin_password_changed()
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  UPDATE public.admin_users SET must_change_password = false WHERE user_id = auth.uid()
$$;

-- Seed existing legacy admins as full-access artists/organizers
INSERT INTO public.admin_users (user_id, email, role)
SELECT u.id, coalesce(u.email, ''), 'artist'
FROM auth.users u
JOIN public.user_roles r ON r.user_id = u.id AND r.role = 'admin'
ON CONFLICT (user_id) DO NOTHING;

-- Bootstrap: first signed-in user becomes artist when no admins exist yet
CREATE OR REPLACE FUNCTION public.claim_admin()
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE uid uuid := auth.uid(); v_email text;
BEGIN
  IF uid IS NULL THEN RETURN false; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.admin_users) THEN
    SELECT email INTO v_email FROM auth.users WHERE id = uid;
    INSERT INTO public.admin_users (user_id, email, role) VALUES (uid, coalesce(v_email,''), 'artist')
    ON CONFLICT (user_id) DO NOTHING;
    INSERT INTO public.user_roles (user_id, role) VALUES (uid, 'admin') ON CONFLICT DO NOTHING;
  END IF;
  RETURN EXISTS (SELECT 1 FROM public.admin_users WHERE user_id = uid AND active);
END;
$$;

CREATE POLICY "Admins read admin users" ON public.admin_users
  FOR SELECT TO authenticated USING (public.is_full_admin() OR user_id = auth.uid());
CREATE POLICY "Full admins update admin users" ON public.admin_users
  FOR UPDATE TO authenticated USING (public.is_full_admin()) WITH CHECK (public.is_full_admin());

-- 3. Media section
CREATE TABLE public.media_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL DEFAULT 'Новое видео',
  description text NOT NULL DEFAULT '',
  video_url text NOT NULL DEFAULT '',
  thumb_url text NOT NULL DEFAULT '',
  kind text NOT NULL DEFAULT 'video',
  published boolean NOT NULL DEFAULT false,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.media_items TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.media_items TO authenticated;
GRANT ALL ON public.media_items TO service_role;
ALTER TABLE public.media_items ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER media_items_updated_at BEFORE UPDATE ON public.media_items
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE POLICY "Published media viewable by everyone" ON public.media_items
  FOR SELECT USING (published = true OR public.can_manage('media'));
CREATE POLICY "Media managers manage media" ON public.media_items
  FOR ALL TO authenticated USING (public.can_manage('media')) WITH CHECK (public.can_manage('media'));

-- 4. Re-scope existing admin policies to the new role model
DROP POLICY IF EXISTS "Admins manage shows" ON public.shows;
CREATE POLICY "Admins manage shows" ON public.shows FOR ALL TO authenticated
  USING (public.can_manage('content')) WITH CHECK (public.can_manage('content'));

DROP POLICY IF EXISTS "Admins manage faq" ON public.faq_items;
CREATE POLICY "Admins manage faq" ON public.faq_items FOR ALL TO authenticated
  USING (public.can_manage('content')) WITH CHECK (public.can_manage('content'));

DROP POLICY IF EXISTS "Admins manage content" ON public.site_content;
CREATE POLICY "Admins manage content" ON public.site_content FOR ALL TO authenticated
  USING (public.can_manage('content')) WITH CHECK (public.can_manage('content'));

DROP POLICY IF EXISTS "Admins manage socials" ON public.social_links;
CREATE POLICY "Admins manage socials" ON public.social_links FOR ALL TO authenticated
  USING (public.can_manage('content')) WITH CHECK (public.can_manage('content'));

DROP POLICY IF EXISTS "Admins manage releases" ON public.releases;
CREATE POLICY "Admins manage releases" ON public.releases FOR ALL TO authenticated
  USING (public.can_manage('content')) WITH CHECK (public.can_manage('content'));
DROP POLICY IF EXISTS "Published releases viewable by everyone" ON public.releases;
CREATE POLICY "Published releases viewable by everyone" ON public.releases FOR SELECT
  USING (published = true OR public.can_manage('content'));

DROP POLICY IF EXISTS "Admins manage tickets" ON public.support_tickets;
CREATE POLICY "Admins manage tickets" ON public.support_tickets FOR ALL TO authenticated
  USING (public.can_manage('content')) WITH CHECK (public.can_manage('content'));

DROP POLICY IF EXISTS "Admins manage support messages" ON public.support_messages;
CREATE POLICY "Admins manage support messages" ON public.support_messages FOR ALL TO authenticated
  USING (public.can_manage('content')) WITH CHECK (public.can_manage('content'));

DROP POLICY IF EXISTS "Admins read analytics events" ON public.analytics_events;
CREATE POLICY "Admins read analytics events" ON public.analytics_events FOR SELECT TO authenticated
  USING (public.is_full_admin());

DROP POLICY IF EXISTS "Admins read analytics sessions" ON public.analytics_sessions;
CREATE POLICY "Admins read analytics sessions" ON public.analytics_sessions FOR SELECT TO authenticated
  USING (public.is_full_admin());

DROP POLICY IF EXISTS "Admins manage albums" ON public.gallery_albums;
CREATE POLICY "Admins manage albums" ON public.gallery_albums FOR ALL TO authenticated
  USING (public.can_manage('gallery')) WITH CHECK (public.can_manage('gallery'));

DROP POLICY IF EXISTS "Admins manage photos" ON public.gallery_photos;
CREATE POLICY "Admins manage photos" ON public.gallery_photos FOR ALL TO authenticated
  USING (public.can_manage('gallery')) WITH CHECK (public.can_manage('gallery'));