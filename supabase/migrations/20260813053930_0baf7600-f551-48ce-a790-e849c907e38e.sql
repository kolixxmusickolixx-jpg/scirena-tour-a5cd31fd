CREATE TABLE public.releases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL DEFAULT 'Новый релиз',
  release_type text NOT NULL DEFAULT 'single',
  cover_path text,
  yandex_url text,
  spotify_url text,
  apple_url text,
  vk_url text,
  published boolean NOT NULL DEFAULT false,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.releases TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.releases TO authenticated;
GRANT ALL ON public.releases TO service_role;

ALTER TABLE public.releases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Published releases viewable by everyone" ON public.releases
  FOR SELECT USING (published = true OR has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins manage releases" ON public.releases FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER releases_updated_at BEFORE UPDATE ON public.releases
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE POLICY "Release covers readable by everyone" ON storage.objects
  FOR SELECT USING (bucket_id = 'releases');
CREATE POLICY "Admins upload release covers" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (bucket_id = 'releases' AND has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins update release covers" ON storage.objects
  FOR UPDATE TO authenticated USING (bucket_id = 'releases' AND has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins delete release covers" ON storage.objects
  FOR DELETE TO authenticated USING (bucket_id = 'releases' AND has_role(auth.uid(), 'admin'::app_role));