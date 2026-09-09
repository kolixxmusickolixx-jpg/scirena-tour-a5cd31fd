INSERT INTO public.site_content (key, value) VALUES ('hero_image_path',''),('hero_video_path','') ON CONFLICT (key) DO NOTHING;

CREATE POLICY "Site media readable" ON storage.objects FOR SELECT USING (bucket_id = 'site-media');
CREATE POLICY "Content managers upload site media" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'site-media' AND public.can_manage('content'));
CREATE POLICY "Content managers update site media" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'site-media' AND public.can_manage('content')) WITH CHECK (bucket_id = 'site-media' AND public.can_manage('content'));
CREATE POLICY "Content managers delete site media" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'site-media' AND public.can_manage('content'));