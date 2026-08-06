CREATE POLICY "Gallery files readable by everyone" ON storage.objects
  FOR SELECT USING (bucket_id = 'gallery');
CREATE POLICY "Admins upload gallery files" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (bucket_id = 'gallery' AND has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins update gallery files" ON storage.objects
  FOR UPDATE TO authenticated USING (bucket_id = 'gallery' AND has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins delete gallery files" ON storage.objects
  FOR DELETE TO authenticated USING (bucket_id = 'gallery' AND has_role(auth.uid(), 'admin'::app_role));