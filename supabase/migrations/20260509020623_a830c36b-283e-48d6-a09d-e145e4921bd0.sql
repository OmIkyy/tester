-- Internal schema for RLS helpers that should not be exposed as public RPC endpoints
CREATE SCHEMA IF NOT EXISTS private;
REVOKE ALL ON SCHEMA private FROM PUBLIC, anon, authenticated;
GRANT USAGE ON SCHEMA private TO authenticated;

CREATE OR REPLACE FUNCTION private.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path TO public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  );
$$;

CREATE OR REPLACE FUNCTION private.get_user_role(_user_id UUID)
RETURNS public.app_role
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path TO public
AS $$
  SELECT role FROM public.user_roles WHERE user_id = _user_id LIMIT 1;
$$;

REVOKE ALL ON FUNCTION private.has_role(UUID, public.app_role) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION private.get_user_role(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private.has_role(UUID, public.app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION private.get_user_role(UUID) TO authenticated;

-- Public wrappers are no longer used by policies and should not be callable from the client
REVOKE ALL ON FUNCTION public.has_role(UUID, public.app_role) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.get_user_role(UUID) FROM PUBLIC, anon, authenticated;

-- PROFILES policies
DROP POLICY IF EXISTS "Users read own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admin/Viewer read profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins update any profile" ON public.profiles;

CREATE POLICY "Users read own profile"
  ON public.profiles FOR SELECT TO authenticated
  USING (id = auth.uid());

CREATE POLICY "Admin/Viewer read profiles"
  ON public.profiles FOR SELECT TO authenticated
  USING (
    private.has_role(auth.uid(), 'ADMIN'::public.app_role)
    OR private.has_role(auth.uid(), 'VIEWER'::public.app_role)
  );

CREATE POLICY "Users update own profile"
  ON public.profiles FOR UPDATE TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Admins update any profile"
  ON public.profiles FOR UPDATE TO authenticated
  USING (private.has_role(auth.uid(), 'ADMIN'::public.app_role))
  WITH CHECK (private.has_role(auth.uid(), 'ADMIN'::public.app_role));

-- USER_ROLES policies
DROP POLICY IF EXISTS "Users see own role" ON public.user_roles;
DROP POLICY IF EXISTS "Admins see all roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins manage roles insert" ON public.user_roles;
DROP POLICY IF EXISTS "Admins manage roles update" ON public.user_roles;
DROP POLICY IF EXISTS "Admins manage roles delete" ON public.user_roles;

CREATE POLICY "Users see own role"
  ON public.user_roles FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins see all roles"
  ON public.user_roles FOR SELECT TO authenticated
  USING (private.has_role(auth.uid(), 'ADMIN'::public.app_role));

CREATE POLICY "Admins manage roles insert"
  ON public.user_roles FOR INSERT TO authenticated
  WITH CHECK (private.has_role(auth.uid(), 'ADMIN'::public.app_role));

CREATE POLICY "Admins manage roles update"
  ON public.user_roles FOR UPDATE TO authenticated
  USING (private.has_role(auth.uid(), 'ADMIN'::public.app_role))
  WITH CHECK (private.has_role(auth.uid(), 'ADMIN'::public.app_role));

CREATE POLICY "Admins manage roles delete"
  ON public.user_roles FOR DELETE TO authenticated
  USING (private.has_role(auth.uid(), 'ADMIN'::public.app_role));

-- CUSTOMERS policies
DROP POLICY IF EXISTS "Admin/Viewer see all customers" ON public.customers;
DROP POLICY IF EXISTS "Sales see own customers" ON public.customers;
DROP POLICY IF EXISTS "Admin insert customers" ON public.customers;
DROP POLICY IF EXISTS "Sales insert own customers" ON public.customers;
DROP POLICY IF EXISTS "Admin update customers" ON public.customers;
DROP POLICY IF EXISTS "Sales update own customers" ON public.customers;
DROP POLICY IF EXISTS "Teknisi update customer status" ON public.customers;
DROP POLICY IF EXISTS "Admin delete customers" ON public.customers;

CREATE POLICY "Admin/Viewer see all customers"
  ON public.customers FOR SELECT TO authenticated
  USING (
    private.has_role(auth.uid(), 'ADMIN'::public.app_role)
    OR private.has_role(auth.uid(), 'VIEWER'::public.app_role)
    OR private.has_role(auth.uid(), 'TEKNISI'::public.app_role)
  );

CREATE POLICY "Sales see own customers"
  ON public.customers FOR SELECT TO authenticated
  USING (private.has_role(auth.uid(), 'SALES'::public.app_role) AND sales_id = auth.uid());

CREATE POLICY "Admin insert customers"
  ON public.customers FOR INSERT TO authenticated
  WITH CHECK (private.has_role(auth.uid(), 'ADMIN'::public.app_role));

CREATE POLICY "Sales insert own customers"
  ON public.customers FOR INSERT TO authenticated
  WITH CHECK (private.has_role(auth.uid(), 'SALES'::public.app_role) AND sales_id = auth.uid());

CREATE POLICY "Admin update customers"
  ON public.customers FOR UPDATE TO authenticated
  USING (private.has_role(auth.uid(), 'ADMIN'::public.app_role))
  WITH CHECK (private.has_role(auth.uid(), 'ADMIN'::public.app_role));

CREATE POLICY "Sales update own customers"
  ON public.customers FOR UPDATE TO authenticated
  USING (private.has_role(auth.uid(), 'SALES'::public.app_role) AND sales_id = auth.uid())
  WITH CHECK (private.has_role(auth.uid(), 'SALES'::public.app_role) AND sales_id = auth.uid());

CREATE POLICY "Teknisi update customer status"
  ON public.customers FOR UPDATE TO authenticated
  USING (private.has_role(auth.uid(), 'TEKNISI'::public.app_role) AND status = 'Pending'::public.customer_status)
  WITH CHECK (private.has_role(auth.uid(), 'TEKNISI'::public.app_role) AND status = 'Selesai'::public.customer_status);

CREATE POLICY "Admin delete customers"
  ON public.customers FOR DELETE TO authenticated
  USING (private.has_role(auth.uid(), 'ADMIN'::public.app_role));

-- INSTALLATIONS policies
DROP POLICY IF EXISTS "Auth read installations" ON public.installations;
DROP POLICY IF EXISTS "Teknisi insert installations" ON public.installations;
DROP POLICY IF EXISTS "Admin update installations" ON public.installations;
DROP POLICY IF EXISTS "Admin delete installations" ON public.installations;

CREATE POLICY "Auth read installations"
  ON public.installations FOR SELECT TO authenticated
  USING (
    private.has_role(auth.uid(), 'ADMIN'::public.app_role)
    OR private.has_role(auth.uid(), 'VIEWER'::public.app_role)
    OR private.has_role(auth.uid(), 'TEKNISI'::public.app_role)
    OR teknisi_id = auth.uid()
  );

CREATE POLICY "Teknisi insert installations"
  ON public.installations FOR INSERT TO authenticated
  WITH CHECK (
    (private.has_role(auth.uid(), 'TEKNISI'::public.app_role) AND teknisi_id = auth.uid())
    OR private.has_role(auth.uid(), 'ADMIN'::public.app_role)
  );

CREATE POLICY "Admin update installations"
  ON public.installations FOR UPDATE TO authenticated
  USING (private.has_role(auth.uid(), 'ADMIN'::public.app_role))
  WITH CHECK (private.has_role(auth.uid(), 'ADMIN'::public.app_role));

CREATE POLICY "Admin delete installations"
  ON public.installations FOR DELETE TO authenticated
  USING (private.has_role(auth.uid(), 'ADMIN'::public.app_role));

-- ACTIVITY LOGS policies
DROP POLICY IF EXISTS "Admin/Viewer read logs" ON public.activity_logs;
DROP POLICY IF EXISTS "Users read own logs" ON public.activity_logs;
DROP POLICY IF EXISTS "Auth insert own logs" ON public.activity_logs;

CREATE POLICY "Admin/Viewer read logs"
  ON public.activity_logs FOR SELECT TO authenticated
  USING (
    private.has_role(auth.uid(), 'ADMIN'::public.app_role)
    OR private.has_role(auth.uid(), 'VIEWER'::public.app_role)
  );

CREATE POLICY "Users read own logs"
  ON public.activity_logs FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Auth insert own logs"
  ON public.activity_logs FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Storage policies
DROP POLICY IF EXISTS "Read own customer photos or admin/viewer" ON storage.objects;
DROP POLICY IF EXISTS "Upload own folder customer photos" ON storage.objects;
DROP POLICY IF EXISTS "Update own folder customer photos" ON storage.objects;
DROP POLICY IF EXISTS "Admin delete customer photos" ON storage.objects;

CREATE POLICY "Read own customer photos or admin/viewer"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'customer-photos'
    AND (
      auth.uid()::text = (storage.foldername(name))[1]
      OR private.has_role(auth.uid(), 'ADMIN'::public.app_role)
      OR private.has_role(auth.uid(), 'VIEWER'::public.app_role)
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
  )
  WITH CHECK (
    bucket_id = 'customer-photos'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Admin delete customer photos"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'customer-photos'
    AND private.has_role(auth.uid(), 'ADMIN'::public.app_role)
  );

-- Make the installation RPC a normal invoker function so it follows RLS policies
CREATE OR REPLACE FUNCTION public.complete_installation(
  _customer_id UUID,
  _onu TEXT,
  _redaman NUMERIC,
  _kabel INTEGER,
  _foto_onu TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path TO public
AS $$
DECLARE
  inst_id UUID;
BEGIN
  IF NOT (
    private.has_role(auth.uid(), 'TEKNISI'::public.app_role)
    OR private.has_role(auth.uid(), 'ADMIN'::public.app_role)
  ) THEN
    RAISE EXCEPTION 'Akses ditolak';
  END IF;

  INSERT INTO public.installations (customer_id, onu, redaman, kabel, foto_onu, teknisi_id)
  VALUES (_customer_id, _onu, _redaman, _kabel, _foto_onu, auth.uid())
  RETURNING id INTO inst_id;

  UPDATE public.customers
  SET status = 'Selesai'
  WHERE id = _customer_id;

  RETURN inst_id;
END;
$$;

REVOKE ALL ON FUNCTION public.complete_installation(UUID, TEXT, NUMERIC, INTEGER, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.complete_installation(UUID, TEXT, NUMERIC, INTEGER, TEXT) TO authenticated;