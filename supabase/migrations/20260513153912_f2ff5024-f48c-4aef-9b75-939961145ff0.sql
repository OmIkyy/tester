
-- ============== SITE SETTINGS ==============
CREATE TABLE public.site_settings (
  id INT PRIMARY KEY DEFAULT 1,
  site_name TEXT NOT NULL DEFAULT 'NetCore ISP',
  site_title TEXT NOT NULL DEFAULT 'NetCore ISP - Sistem Manajemen Pelanggan',
  site_description TEXT NOT NULL DEFAULT 'Sistem manajemen pelanggan internet',
  footer_text TEXT NOT NULL DEFAULT '© NetCore ISP. All rights reserved.',
  primary_color TEXT NOT NULL DEFAULT '221 83% 53%',
  logo_url TEXT,
  favicon_url TEXT,
  og_image_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT site_settings_singleton CHECK (id = 1)
);

ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read site settings" ON public.site_settings
  FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "Admin update site settings" ON public.site_settings
  FOR UPDATE TO authenticated
  USING (private.has_role(auth.uid(), 'ADMIN'::public.app_role))
  WITH CHECK (private.has_role(auth.uid(), 'ADMIN'::public.app_role));

CREATE POLICY "Admin insert site settings" ON public.site_settings
  FOR INSERT TO authenticated
  WITH CHECK (private.has_role(auth.uid(), 'ADMIN'::public.app_role));

CREATE TRIGGER trg_site_settings_updated
  BEFORE UPDATE ON public.site_settings
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

INSERT INTO public.site_settings (id) VALUES (1) ON CONFLICT DO NOTHING;

-- ============== PACKAGES ==============
CREATE TABLE public.packages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nama TEXT NOT NULL,
  kecepatan_text TEXT NOT NULL,
  kecepatan_mbps INT,
  harga NUMERIC(12,2) NOT NULL DEFAULT 0,
  deskripsi TEXT,
  warna TEXT DEFAULT '#3b82f6',
  icon TEXT DEFAULT 'Wifi',
  urutan INT NOT NULL DEFAULT 0,
  aktif BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.packages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Auth read packages" ON public.packages
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admin manage packages ins" ON public.packages
  FOR INSERT TO authenticated
  WITH CHECK (private.has_role(auth.uid(), 'ADMIN'::public.app_role));

CREATE POLICY "Admin manage packages upd" ON public.packages
  FOR UPDATE TO authenticated
  USING (private.has_role(auth.uid(), 'ADMIN'::public.app_role))
  WITH CHECK (private.has_role(auth.uid(), 'ADMIN'::public.app_role));

CREATE POLICY "Admin manage packages del" ON public.packages
  FOR DELETE TO authenticated
  USING (private.has_role(auth.uid(), 'ADMIN'::public.app_role));

CREATE TRIGGER trg_packages_updated
  BEFORE UPDATE ON public.packages
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

INSERT INTO public.packages (nama, kecepatan_text, kecepatan_mbps, harga, deskripsi, warna, urutan) VALUES
  ('Home Basic', '15 Mbps', 15, 150000, 'Cocok untuk browsing dan sosial media', '#3b82f6', 1),
  ('Home Plus', '35 Mbps', 35, 250000, 'Streaming HD dan gaming ringan', '#8b5cf6', 2),
  ('Fiber Pro', '100 Mbps Fiber', 100, 450000, 'Untuk keluarga aktif & WFH', '#10b981', 3),
  ('Dedicated Corporate', '200 Mbps Dedicated', 200, 1500000, 'Bandwidth dedicated untuk bisnis', '#f59e0b', 4);

-- ============== CUSTOMER TYPES ==============
CREATE TABLE public.customer_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nama TEXT NOT NULL UNIQUE,
  aktif BOOLEAN NOT NULL DEFAULT true,
  urutan INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.customer_types ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Auth read customer_types" ON public.customer_types
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admin manage customer_types ins" ON public.customer_types
  FOR INSERT TO authenticated
  WITH CHECK (private.has_role(auth.uid(), 'ADMIN'::public.app_role));

CREATE POLICY "Admin manage customer_types upd" ON public.customer_types
  FOR UPDATE TO authenticated
  USING (private.has_role(auth.uid(), 'ADMIN'::public.app_role))
  WITH CHECK (private.has_role(auth.uid(), 'ADMIN'::public.app_role));

CREATE POLICY "Admin manage customer_types del" ON public.customer_types
  FOR DELETE TO authenticated
  USING (private.has_role(auth.uid(), 'ADMIN'::public.app_role));

CREATE TRIGGER trg_customer_types_updated
  BEFORE UPDATE ON public.customer_types
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

INSERT INTO public.customer_types (nama, urutan) VALUES
  ('Rumah', 1),
  ('Bisnis', 2),
  ('Kantor', 3),
  ('Sekolah', 4),
  ('Corporate', 5);

-- ============== PROFILES NAME SPLIT ==============
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS nama_depan TEXT,
  ADD COLUMN IF NOT EXISTS nama_belakang TEXT;

-- ============== CUSTOMERS ADDRESS ==============
ALTER TABLE public.customers
  ADD COLUMN IF NOT EXISTS provinsi_code TEXT,
  ADD COLUMN IF NOT EXISTS provinsi_nama TEXT,
  ADD COLUMN IF NOT EXISTS kota_code TEXT,
  ADD COLUMN IF NOT EXISTS kota_nama TEXT,
  ADD COLUMN IF NOT EXISTS kecamatan_code TEXT,
  ADD COLUMN IF NOT EXISTS kecamatan_nama TEXT,
  ADD COLUMN IF NOT EXISTS kelurahan_code TEXT,
  ADD COLUMN IF NOT EXISTS kelurahan_nama TEXT,
  ADD COLUMN IF NOT EXISTS paket_id UUID REFERENCES public.packages(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS jenis_id UUID REFERENCES public.customer_types(id) ON DELETE SET NULL;

-- ============== STORAGE BRANDING BUCKET ==============
INSERT INTO storage.buckets (id, name, public)
  VALUES ('branding', 'branding', true)
  ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Public read branding"
  ON storage.objects FOR SELECT TO anon, authenticated
  USING (bucket_id = 'branding');

CREATE POLICY "Admin upload branding"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'branding' AND private.has_role(auth.uid(), 'ADMIN'::public.app_role));

CREATE POLICY "Admin update branding"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'branding' AND private.has_role(auth.uid(), 'ADMIN'::public.app_role));

CREATE POLICY "Admin delete branding"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'branding' AND private.has_role(auth.uid(), 'ADMIN'::public.app_role));

-- ============== REALTIME ==============
ALTER TABLE public.site_settings REPLICA IDENTITY FULL;
ALTER TABLE public.packages REPLICA IDENTITY FULL;
ALTER TABLE public.customer_types REPLICA IDENTITY FULL;

ALTER PUBLICATION supabase_realtime ADD TABLE public.site_settings;
ALTER PUBLICATION supabase_realtime ADD TABLE public.packages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.customer_types;
