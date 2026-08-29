
DROP POLICY IF EXISTS "Admins upload release covers" ON storage.objects;
DROP POLICY IF EXISTS "Admins update release covers" ON storage.objects;
DROP POLICY IF EXISTS "Admins delete release covers" ON storage.objects;
DROP POLICY IF EXISTS "Admins upload gallery files" ON storage.objects;
DROP POLICY IF EXISTS "Admins update gallery files" ON storage.objects;
DROP POLICY IF EXISTS "Admins delete gallery files" ON storage.objects;

CREATE POLICY "Admins upload release covers" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'releases' AND public.can_manage('content'));
CREATE POLICY "Admins update release covers" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'releases' AND public.can_manage('content'))
  WITH CHECK (bucket_id = 'releases' AND public.can_manage('content'));
CREATE POLICY "Admins delete release covers" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'releases' AND public.can_manage('content'));

CREATE POLICY "Admins upload gallery files" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'gallery' AND public.can_manage('gallery'));
CREATE POLICY "Admins update gallery files" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'gallery' AND public.can_manage('gallery'))
  WITH CHECK (bucket_id = 'gallery' AND public.can_manage('gallery'));
CREATE POLICY "Admins delete gallery files" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'gallery' AND public.can_manage('gallery'));
