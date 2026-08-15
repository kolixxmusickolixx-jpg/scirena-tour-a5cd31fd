CREATE TABLE public.analytics_sessions (
  id uuid PRIMARY KEY,
  visitor_id text NOT NULL,
  is_new boolean NOT NULL DEFAULT true,
  device text NOT NULL DEFAULT 'desktop',
  source text NOT NULL DEFAULT 'direct',
  referrer_host text NOT NULL DEFAULT '',
  country text NOT NULL DEFAULT '',
  entry_path text NOT NULL DEFAULT '/',
  page_views integer NOT NULL DEFAULT 0,
  started_at timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.analytics_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES public.analytics_sessions(id) ON DELETE CASCADE,
  visitor_id text NOT NULL,
  event_name text NOT NULL,
  path text NOT NULL DEFAULT '/',
  device text NOT NULL DEFAULT 'desktop',
  source text NOT NULL DEFAULT 'direct',
  country text NOT NULL DEFAULT '',
  duration_ms integer NOT NULL DEFAULT 0,
  props jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX analytics_sessions_started_at_idx ON public.analytics_sessions (started_at DESC);
CREATE INDEX analytics_sessions_visitor_idx ON public.analytics_sessions (visitor_id);
CREATE INDEX analytics_events_created_at_idx ON public.analytics_events (created_at DESC);
CREATE INDEX analytics_events_name_created_idx ON public.analytics_events (event_name, created_at DESC);
CREATE INDEX analytics_events_session_idx ON public.analytics_events (session_id);
CREATE INDEX analytics_events_path_idx ON public.analytics_events (path);

GRANT SELECT ON public.analytics_sessions TO authenticated;
GRANT SELECT ON public.analytics_events TO authenticated;
GRANT ALL ON public.analytics_sessions TO service_role;
GRANT ALL ON public.analytics_events TO service_role;

ALTER TABLE public.analytics_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analytics_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins read analytics sessions" ON public.analytics_sessions
  FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins read analytics events" ON public.analytics_events
  FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

CREATE OR REPLACE FUNCTION public.analytics_track(
  p_session_id uuid,
  p_visitor_id text,
  p_event text,
  p_path text,
  p_device text,
  p_source text,
  p_referrer_host text,
  p_country text,
  p_is_new boolean,
  p_duration_ms integer,
  p_props jsonb
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_event text := lower(left(coalesce(trim(p_event), ''), 40));
  v_path text := left(coalesce(nullif(trim(p_path), ''), '/'), 200);
  v_device text := CASE WHEN lower(coalesce(p_device,'')) IN ('mobile','tablet','desktop') THEN lower(p_device) ELSE 'desktop' END;
  v_source text := CASE WHEN lower(coalesce(p_source,'')) IN ('direct','organic','social','referral','other') THEN lower(p_source) ELSE 'other' END;
BEGIN
  IF p_session_id IS NULL OR coalesce(length(trim(p_visitor_id)),0) < 4 OR v_event = '' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'invalid_input');
  END IF;

  INSERT INTO public.analytics_sessions AS s
    (id, visitor_id, is_new, device, source, referrer_host, country, entry_path, page_views, started_at, last_seen_at)
  VALUES (
    p_session_id, left(trim(p_visitor_id), 64), coalesce(p_is_new, true), v_device, v_source,
    left(coalesce(p_referrer_host,''), 120), left(upper(coalesce(p_country,'')), 2), v_path,
    CASE WHEN v_event = 'page_view' THEN 1 ELSE 0 END, now(), now()
  )
  ON CONFLICT (id) DO UPDATE
    SET last_seen_at = now(),
        page_views = s.page_views + CASE WHEN v_event = 'page_view' THEN 1 ELSE 0 END,
        country = CASE WHEN s.country = '' THEN left(upper(coalesce(p_country,'')), 2) ELSE s.country END;

  INSERT INTO public.analytics_events
    (session_id, visitor_id, event_name, path, device, source, country, duration_ms, props)
  VALUES (
    p_session_id, left(trim(p_visitor_id), 64), v_event, v_path, v_device, v_source,
    left(upper(coalesce(p_country,'')), 2), greatest(0, least(coalesce(p_duration_ms, 0), 86400000)),
    coalesce(p_props, '{}'::jsonb)
  );

  RETURN jsonb_build_object('ok', true);
END;
$$;

REVOKE ALL ON FUNCTION public.analytics_track(uuid, text, text, text, text, text, text, text, boolean, integer, jsonb) FROM public;
GRANT EXECUTE ON FUNCTION public.analytics_track(uuid, text, text, text, text, text, text, text, boolean, integer, jsonb) TO anon, authenticated, service_role;