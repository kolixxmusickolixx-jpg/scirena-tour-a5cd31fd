CREATE TABLE public.gallery_albums (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  date_label text NOT NULL DEFAULT '',
  cover_url text NOT NULL DEFAULT '',
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.gallery_albums TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.gallery_albums TO authenticated;
GRANT ALL ON public.gallery_albums TO service_role;
ALTER TABLE public.gallery_albums ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Albums viewable by everyone" ON public.gallery_albums FOR SELECT USING (true);
CREATE POLICY "Admins manage albums" ON public.gallery_albums FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE TRIGGER gallery_albums_updated_at BEFORE UPDATE ON public.gallery_albums
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.gallery_photos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  album_id uuid NOT NULL REFERENCES public.gallery_albums(id) ON DELETE CASCADE,
  storage_path text NOT NULL,
  url text NOT NULL,
  width integer,
  height integer,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX gallery_photos_album_idx ON public.gallery_photos (album_id, sort_order);
GRANT SELECT ON public.gallery_photos TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.gallery_photos TO authenticated;
GRANT ALL ON public.gallery_photos TO service_role;
ALTER TABLE public.gallery_photos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Photos viewable by everyone" ON public.gallery_photos FOR SELECT USING (true);
CREATE POLICY "Admins manage photos" ON public.gallery_photos FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE TRIGGER gallery_photos_updated_at BEFORE UPDATE ON public.gallery_photos
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();