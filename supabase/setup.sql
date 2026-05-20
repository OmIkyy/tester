-- =============================================================================
-- NetCore DG-KOMPUTER — Complete Database Setup
-- =============================================================================
-- Pakai file ini untuk menyiapkan database baru dari nol.
-- Aman dijalankan berulang kali sejauh struktur tabelnya masih mengikuti project ini.
--
-- Urutan besar:
--   1. Enum dan tabel aplikasi
--   2. Index dan constraint penting
--   3. Helper keamanan internal untuk RLS
--   4. Trigger profil otomatis saat user daftar
--   5. RLS untuk semua tabel aplikasi
--   6. Storage private untuk foto pelanggan
--   7. Realtime untuk sinkronisasi role/profile
--   8. RPC penyelesaian pemasangan
-- =============================================================================


-- =============================================================================
-- 1. ENUMS
-- =============================================================================
DO $$ BEGIN
  CREATE TYPE public.app_role AS ENUM ('ADMIN', 'SALES', 'TEKNISI', 'VIEWER');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.customer_status AS ENUM ('Pending', 'Selesai');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;


-- =============================================================================
-- 2. TABLES
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.profiles (
  id         UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nama       TEXT NOT NULL DEFAULT '',
  email      TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.user_roles (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role       public.app_role NOT NULL,
  access     JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.customers (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  nama       TEXT NOT NULL,
  nik        TEXT,
  wa         TEXT,
  alamat     TEXT,
  area       TEXT,
  paket      TEXT,
  odp        TEXT,
  maps       TEXT,
  jenis      TEXT,
  sales_id   UUID,
  status     public.customer_status NOT NULL DEFAULT 'Pending',
  foto_ktp   TEXT,
  foto_rumah TEXT
);
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.installations (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  onu         TEXT,
  redaman     NUMERIC,
  kabel       INTEGER,
  foto_onu    TEXT,
  teknisi_id  UUID,
  selesai_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.installations ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.activity_logs (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID,
  action     TEXT NOT NULL,
  details    TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;


-- =============================================================================
-- 3. INDEXES & ROLE CONSTRAINT CLEANUP
-- =============================================================================
CREATE INDEX IF NOT EXISTS idx_customers_sales    ON public.customers(sales_id);
CREATE INDEX IF NOT EXISTS idx_customers_status   ON public.customers(status);
CREATE INDEX IF NOT EXISTS idx_customers_created  ON public.customers(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_installations_cust ON public.installations(customer_id);
CREATE INDEX IF NOT EXISTS idx_installations_tech ON public.installations(teknisi_id);
CREATE INDEX IF NOT EXISTS idx_logs_created       ON public.activity_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_logs_user          ON public.activity_logs(user_id);

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_schema = 'public'
      AND table_name = 'user_roles'
      AND constraint_name = 'user_roles_user_id_role_key'
  ) THEN
    ALTER TABLE public.user_roles DROP CONSTRAINT user_roles_user_id_role_key;
  END IF;

  DELETE FROM public.user_roles a
  USING public.user_roles b
  WHERE a.user_id = b.user_id
    AND a.created_at < b.created_at;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_schema = 'public'
      AND table_name = 'user_roles'
      AND constraint_name = 'user_roles_user_id_key'
  ) THEN
    ALTER TABLE public.user_roles ADD CONSTRAINT user_roles_user_id_key UNIQUE (user_id);
  END IF;
END $$;


-- =============================================================================
-- 4. INTERNAL SECURITY HELPERS
-- =============================================================================
-- Helper role sengaja disimpan di schema private supaya tidak jadi RPC publik.
-- RLS tetap bisa memanggilnya, tapi client tidak memakai fungsi ini langsung.
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

-- Public wrappers lama ditutup agar tidak terekspos lewat API.
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path TO public
AS $$ SELECT private.has_role(_user_id, _role); $$;

CREATE OR REPLACE FUNCTION public.get_user_role(_user_id UUID)
RETURNS public.app_role
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path TO public
AS $$ SELECT private.get_user_role(_user_id); $$;

REVOKE ALL ON FUNCTION public.has_role(UUID, public.app_role) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.get_user_role(UUID) FROM PUBLIC, anon, authenticated;


-- =============================================================================
-- 5. AUTH & PROFILE TRIGGERS
-- =============================================================================
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path TO public
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS touch_profiles ON public.profiles;
CREATE TRIGGER touch_profiles
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.touch_updated_at();

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $$
DECLARE
  user_count INT;
  assigned_role public.app_role;
BEGIN
  INSERT INTO public.profiles (id, nama, email)
  VALUES (
    NEW.id,
    COALESCE(NULLIF(NEW.raw_user_meta_data->>'nama', ''), split_part(NEW.email, '@', 1)),
    COALESCE(NEW.email, '')
  )
  ON CONFLICT (id) DO UPDATE
  SET nama = COALESCE(NULLIF(EXCLUDED.nama, ''), public.profiles.nama),
      email = COALESCE(NULLIF(EXCLUDED.email, ''), public.profiles.email);

  SELECT COUNT(*) INTO user_count FROM public.user_roles;
  assigned_role := CASE WHEN user_count = 0 THEN 'ADMIN'::public.app_role ELSE 'VIEWER'::public.app_role END;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, assigned_role)
  ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.handle_new_user();


-- =============================================================================
-- 6. RLS POLICIES
-- =============================================================================
-- PROFILES -----------------------------------------------------------------
DROP POLICY IF EXISTS "Profiles viewable by authenticated" ON public.profiles;
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

-- USER_ROLES ---------------------------------------------------------------
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

-- CUSTOMERS ----------------------------------------------------------------
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

-- INSTALLATIONS ------------------------------------------------------------
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

-- ACTIVITY LOGS ------------------------------------------------------------
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


-- =============================================================================
-- 7. STORAGE BUCKET & POLICIES
-- =============================================================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('customer-photos', 'customer-photos', false)
ON CONFLICT (id) DO UPDATE SET public = false;

DROP POLICY IF EXISTS "Public read customer photos" ON storage.objects;
DROP POLICY IF EXISTS "Auth list customer photos" ON storage.objects;
DROP POLICY IF EXISTS "Auth update own customer photos" ON storage.objects;
DROP POLICY IF EXISTS "Auth upload customer photos" ON storage.objects;
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


-- =============================================================================
-- 8. REALTIME PUBLICATION
-- =============================================================================
ALTER TABLE public.profiles      REPLICA IDENTITY FULL;
ALTER TABLE public.user_roles    REPLICA IDENTITY FULL;
ALTER TABLE public.customers     REPLICA IDENTITY FULL;
ALTER TABLE public.installations REPLICA IDENTITY FULL;
ALTER TABLE public.activity_logs REPLICA IDENTITY FULL;

DO $$
BEGIN
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.user_roles; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.customers; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.installations; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.activity_logs; EXCEPTION WHEN duplicate_object THEN NULL; END;
END $$;


-- =============================================================================
-- 9. COMPLETE INSTALLATION RPC
-- =============================================================================
-- Function ini SECURITY INVOKER, jadi tetap mengikuti RLS aktif.
CREATE OR REPLACE FUNCTION public.complete_installation(
  _customer_id UUID,
  _onu         TEXT,
  _redaman     NUMERIC,
  _kabel       INTEGER,
  _foto_onu    TEXT DEFAULT NULL
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
