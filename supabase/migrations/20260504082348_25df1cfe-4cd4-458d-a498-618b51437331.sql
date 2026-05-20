-- Restrict storage listing to authenticated users only
DROP POLICY IF EXISTS "Public read customer photos" ON storage.objects;

CREATE POLICY "Auth list customer photos"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'customer-photos');