
DROP POLICY IF EXISTS "Public read branding" ON storage.objects;

CREATE POLICY "Admin list branding"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'branding' AND private.has_role(auth.uid(), 'ADMIN'::public.app_role));
