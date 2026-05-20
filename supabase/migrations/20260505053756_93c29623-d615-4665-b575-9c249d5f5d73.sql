
-- 1. Make customer-photos bucket private
UPDATE storage.buckets SET public = false WHERE id = 'customer-photos';

-- 2. Replace storage policies with ownership-based ones
DROP POLICY IF EXISTS "Auth list customer photos" ON storage.objects;
DROP POLICY IF EXISTS "Auth update own customer photos" ON storage.objects;
DROP POLICY IF EXISTS "Auth upload customer photos" ON storage.objects;
DROP POLICY IF EXISTS "Admin delete customer photos" ON storage.objects;

CREATE POLICY "Read own customer photos or admin/viewer"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'customer-photos'
  AND (
    auth.uid()::text = (storage.foldername(name))[1]
    OR public.has_role(auth.uid(), 'ADMIN'::public.app_role)
    OR public.has_role(auth.uid(), 'VIEWER'::public.app_role)
  )
);

CREATE POLICY "Upload own folder customer photos"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'customer-photos'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Update own folder customer photos"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'customer-photos'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Admin delete customer photos"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'customer-photos'
  AND public.has_role(auth.uid(), 'ADMIN'::public.app_role)
);

-- 3. Tighten profiles SELECT — no longer expose all emails
DROP POLICY IF EXISTS "Profiles viewable by authenticated" ON public.profiles;

CREATE POLICY "Users read own profile"
ON public.profiles FOR SELECT TO authenticated
USING (id = auth.uid());

CREATE POLICY "Admin/Viewer read profiles"
ON public.profiles FOR SELECT TO authenticated
USING (
  public.has_role(auth.uid(), 'ADMIN'::public.app_role)
  OR public.has_role(auth.uid(), 'VIEWER'::public.app_role)
);

-- 4. Remove broad teknisi UPDATE on customers
DROP POLICY IF EXISTS "Teknisi update customer status" ON public.customers;

-- 5. Secure RPC for technicians to complete installation
CREATE OR REPLACE FUNCTION public.complete_installation(
  _customer_id uuid,
  _onu text,
  _redaman numeric,
  _kabel integer,
  _foto_onu text DEFAULT NULL
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  inst_id uuid;
BEGIN
  IF NOT (public.has_role(auth.uid(), 'TEKNISI'::public.app_role)
          OR public.has_role(auth.uid(), 'ADMIN'::public.app_role)) THEN
    RAISE EXCEPTION 'Akses ditolak';
  END IF;

  INSERT INTO public.installations (customer_id, onu, redaman, kabel, foto_onu, teknisi_id)
  VALUES (_customer_id, _onu, _redaman, _kabel, _foto_onu, auth.uid())
  RETURNING id INTO inst_id;

  UPDATE public.customers SET status = 'Selesai' WHERE id = _customer_id;

  RETURN inst_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.complete_installation(uuid, text, numeric, integer, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.complete_installation(uuid, text, numeric, integer, text) TO authenticated;

-- 6. Lock down SECURITY DEFINER helpers (still callable by RLS policies)
REVOKE EXECUTE ON FUNCTION public.get_user_role(uuid) FROM PUBLIC, authenticated, anon;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, authenticated, anon;

-- 7. Remove sensitive tables from realtime publication
ALTER PUBLICATION supabase_realtime DROP TABLE public.activity_logs;
ALTER PUBLICATION supabase_realtime DROP TABLE public.installations;
ALTER PUBLICATION supabase_realtime DROP TABLE public.customers;
