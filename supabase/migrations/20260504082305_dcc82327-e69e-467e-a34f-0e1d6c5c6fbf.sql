-- =========================================
-- ENUMS
-- =========================================
CREATE TYPE public.app_role AS ENUM ('ADMIN', 'SALES', 'TEKNISI', 'VIEWER');
CREATE TYPE public.customer_status AS ENUM ('Pending', 'Selesai');

-- =========================================
-- PROFILES
-- =========================================
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nama TEXT NOT NULL DEFAULT '',
  email TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- =========================================
-- USER ROLES
-- =========================================
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  access JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Security definer function to check roles (avoid RLS recursion)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  );
$$;

CREATE OR REPLACE FUNCTION public.get_user_role(_user_id UUID)
RETURNS public.app_role
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.user_roles WHERE user_id = _user_id LIMIT 1;
$$;

-- =========================================
-- CUSTOMERS
-- =========================================
CREATE TABLE public.customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  nama TEXT NOT NULL,
  nik TEXT,
  wa TEXT,
  alamat TEXT,
  area TEXT,
  paket TEXT,
  odp TEXT,
  maps TEXT,
  jenis TEXT,
  sales_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  status public.customer_status NOT NULL DEFAULT 'Pending',
  foto_ktp TEXT,
  foto_rumah TEXT
);
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_customers_sales ON public.customers(sales_id);
CREATE INDEX idx_customers_status ON public.customers(status);

-- =========================================
-- INSTALLATIONS
-- =========================================
CREATE TABLE public.installations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  onu TEXT,
  redaman NUMERIC,
  kabel INTEGER,
  foto_onu TEXT,
  teknisi_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  selesai_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.installations ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_installations_customer ON public.installations(customer_id);

-- =========================================
-- ACTIVITY LOGS
-- =========================================
CREATE TABLE public.activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  details TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_logs_created ON public.activity_logs(created_at DESC);

-- =========================================
-- AUTO-CREATE PROFILE + DEFAULT ROLE ON SIGNUP
-- =========================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_count INT;
  assigned_role public.app_role;
BEGIN
  INSERT INTO public.profiles (id, nama, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'nama', split_part(NEW.email, '@', 1)),
    NEW.email
  );

  -- First user becomes ADMIN, rest become VIEWER
  SELECT COUNT(*) INTO user_count FROM public.user_roles;
  IF user_count = 0 THEN
    assigned_role := 'ADMIN';
  ELSE
    assigned_role := 'VIEWER';
  END IF;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, assigned_role);

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =========================================
-- updated_at trigger for profiles
-- =========================================
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;
CREATE TRIGGER touch_profiles BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- =========================================
-- RLS POLICIES — PROFILES
-- =========================================
CREATE POLICY "Profiles viewable by authenticated"
  ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users update own profile"
  ON public.profiles FOR UPDATE TO authenticated
  USING (auth.uid() = id);
CREATE POLICY "Admins update any profile"
  ON public.profiles FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'ADMIN'));

-- =========================================
-- RLS POLICIES — USER_ROLES
-- =========================================
CREATE POLICY "Users see own role"
  ON public.user_roles FOR SELECT TO authenticated
  USING (auth.uid() = user_id);
CREATE POLICY "Admins see all roles"
  ON public.user_roles FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'ADMIN'));
CREATE POLICY "Admins manage roles insert"
  ON public.user_roles FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'ADMIN'));
CREATE POLICY "Admins manage roles update"
  ON public.user_roles FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'ADMIN'));
CREATE POLICY "Admins manage roles delete"
  ON public.user_roles FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'ADMIN'));

-- =========================================
-- RLS POLICIES — CUSTOMERS
-- =========================================
-- SELECT: admin/viewer/teknisi see all, sales sees own
CREATE POLICY "Admin/Viewer see all customers"
  ON public.customers FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'ADMIN') OR
    public.has_role(auth.uid(), 'VIEWER') OR
    public.has_role(auth.uid(), 'TEKNISI')
  );
CREATE POLICY "Sales see own customers"
  ON public.customers FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'SALES') AND sales_id = auth.uid());

-- INSERT: admin and sales (sales must set themselves as sales_id)
CREATE POLICY "Admin insert customers"
  ON public.customers FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'ADMIN'));
CREATE POLICY "Sales insert own customers"
  ON public.customers FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'SALES') AND sales_id = auth.uid());

-- UPDATE: admin all, teknisi can update status, sales own
CREATE POLICY "Admin update customers"
  ON public.customers FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'ADMIN'));
CREATE POLICY "Sales update own customers"
  ON public.customers FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'SALES') AND sales_id = auth.uid());
CREATE POLICY "Teknisi update customer status"
  ON public.customers FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'TEKNISI'));

-- DELETE: admin only
CREATE POLICY "Admin delete customers"
  ON public.customers FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'ADMIN'));

-- =========================================
-- RLS POLICIES — INSTALLATIONS
-- =========================================
CREATE POLICY "Auth read installations"
  ON public.installations FOR SELECT TO authenticated USING (true);
CREATE POLICY "Teknisi insert installations"
  ON public.installations FOR INSERT TO authenticated
  WITH CHECK (
    (public.has_role(auth.uid(), 'TEKNISI') AND teknisi_id = auth.uid())
    OR public.has_role(auth.uid(), 'ADMIN')
  );
CREATE POLICY "Admin update installations"
  ON public.installations FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'ADMIN'));
CREATE POLICY "Admin delete installations"
  ON public.installations FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'ADMIN'));

-- =========================================
-- RLS POLICIES — ACTIVITY LOGS
-- =========================================
CREATE POLICY "Admin/Viewer read logs"
  ON public.activity_logs FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'ADMIN') OR
    public.has_role(auth.uid(), 'VIEWER')
  );
CREATE POLICY "Users read own logs"
  ON public.activity_logs FOR SELECT TO authenticated
  USING (user_id = auth.uid());
CREATE POLICY "Auth insert own logs"
  ON public.activity_logs FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

-- =========================================
-- STORAGE BUCKET
-- =========================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('customer-photos', 'customer-photos', true);

CREATE POLICY "Public read customer photos"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'customer-photos');
CREATE POLICY "Auth upload customer photos"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'customer-photos');
CREATE POLICY "Auth update own customer photos"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'customer-photos');
CREATE POLICY "Admin delete customer photos"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'customer-photos' AND public.has_role(auth.uid(), 'ADMIN'));

-- =========================================
-- REALTIME
-- =========================================
ALTER TABLE public.customers REPLICA IDENTITY FULL;
ALTER TABLE public.installations REPLICA IDENTITY FULL;
ALTER TABLE public.activity_logs REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.customers;
ALTER PUBLICATION supabase_realtime ADD TABLE public.installations;
ALTER PUBLICATION supabase_realtime ADD TABLE public.activity_logs;