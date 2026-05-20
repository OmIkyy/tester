import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { logActivity } from "@/lib/logger";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Loader2, Upload, ArrowLeft, MapPin, Search, LocateFixed } from "lucide-react";
import { AddressPicker, emptyWilayah, WilayahValue } from "@/components/forms/AddressPicker";
import { usePackages, useCustomerTypes } from "@/hooks/useMasterData";

const schema = z.object({
  nama: z.string().trim().min(2, "Nama minimal 2 karakter").max(120),
  nik: z.string().trim().max(32).optional(),
  wa: z.string().trim().max(20).optional(),
  alamat: z.string().trim().max(500).optional(),
  area: z.string().trim().max(80).optional(),
  paket: z.string().trim().max(80).optional(),
  paket_id: z.string().uuid().nullable().optional(),
  jenis_id: z.string().uuid().nullable().optional(),
  odp: z.string().trim().max(80).optional(),
  maps: z.string().trim().max(500).optional(),
  jenis: z.string().trim().max(40).optional(),
});

export default function CustomerNew() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { items: packages } = usePackages();
  const { items: types } = useCustomerTypes();
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    nama: "", nik: "", wa: "", alamat: "", area: "", paket: "", paket_id: "", odp: "", maps: "", jenis: "", jenis_id: "",
  });
  const [wilayah, setWilayah] = useState<WilayahValue>(emptyWilayah());
  const [ktpFile, setKtpFile] = useState<File | null>(null);
  const [rumahFile, setRumahFile] = useState<File | null>(null);

  useEffect(() => { document.title = "Daftar Pelanggan · DG-KOMPUTER"; }, []);

  const update = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const uploadPhoto = async (file: File, prefix: string): Promise<string | null> => {
    if (!user) return null;
    const ext = file.name.split(".").pop();
    const path = `${user.id}/${prefix}-${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("customer-photos").upload(path, file, { upsert: false });
    if (error) {
      toast.error(`Upload ${prefix} gagal`, { description: error.message });
      return null;
    }
    // Store the storage path; bucket is private, signed URLs are issued on view.
    return path;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    const parse = schema.safeParse(form);
    if (!parse.success) {
      toast.error(parse.error.errors[0].message);
      return;
    }
    setSubmitting(true);
    let foto_ktp: string | null = null;
    let foto_rumah: string | null = null;
    if (ktpFile) foto_ktp = await uploadPhoto(ktpFile, "ktp");
    if (rumahFile) foto_rumah = await uploadPhoto(rumahFile, "rumah");

    const payload: any = {
      nama: form.nama,
      nik: form.nik || null,
      wa: form.wa || null,
      alamat: form.alamat || null,
      area: form.area || wilayah.kota_nama || null,
      paket: form.paket || null,
      paket_id: form.paket_id || null,
      odp: form.odp || null,
      maps: form.maps || null,
      jenis: form.jenis || null,
      jenis_id: form.jenis_id || null,
      sales_id: user.id,
      status: "Pending",
      foto_ktp,
      foto_rumah,
      ...wilayah,
    };
    const { error } = await supabase.from("customers").insert(payload);
    setSubmitting(false);
    if (error) {
      toast.error("Gagal mendaftarkan pelanggan", { description: error.message });
      return;
    }
    await logActivity("tambah_pelanggan", `Pelanggan baru: ${form.nama}`);
    toast.success("Pelanggan berhasil didaftarkan");
    navigate("/pelanggan");
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-display font-semibold">Daftar Pelanggan Baru</h1>
          <p className="text-sm text-muted-foreground">Lengkapi data pelanggan & upload dokumen pendukung.</p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <Card className="border-border/60 shadow-card">
          <CardHeader>
            <CardTitle className="text-base font-display">Informasi Pelanggan</CardTitle>
            <CardDescription>Data pribadi & kontak</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="nama">Nama Lengkap *</Label>
              <Input
                id="nama"
                value={form.nama}
                onChange={(e) =>
                  update(
                    "nama",
                    e.target.value
                      .toUpperCase()
                      .replace(/\s+/g, " ")
                      .trimStart()
                  )
                }
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="nik">NIK</Label>
              <Input id="nik" value={form.nik} onChange={(e) => update("nik", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="wa">No. WhatsApp</Label>
              <Input id="wa" placeholder="0812xxxxxxxx" value={form.wa} onChange={(e) => update("wa", e.target.value)} />
            </div>
            <div className="md:col-span-2">
              <AddressPicker value={wilayah} onChange={setWilayah} />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="alamat">Detail Alamat Lengkap *</Label>
              <Textarea id="alamat" rows={2} placeholder="Jl. ... No. ..., RT/RW, patokan" value={form.alamat} onChange={(e) => update("alamat", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="odp">ODP</Label>
              <Input id="odp" value={form.odp} onChange={(e) => update("odp", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="area">Area</Label>
              <Input id="area" placeholder="Opsional, mis. nama cluster" value={form.area} onChange={(e) => update("area", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Paket</Label>
              <Select
                value={form.paket_id}
                onValueChange={(v) => {
                  const p = packages.find((x) => x.id === v);
                  setForm((f) => ({ ...f, paket_id: v, paket: p?.nama ?? "" }));
                }}
              >
                <SelectTrigger><SelectValue placeholder="Pilih paket" /></SelectTrigger>
                <SelectContent>
                  {packages.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.nama} · {p.kecepatan_text}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Jenis</Label>
              <Select
                value={form.jenis_id}
                onValueChange={(v) => {
                  const t = types.find((x) => x.id === v);
                  setForm((f) => ({ ...f, jenis_id: v, jenis: t?.nama ?? "" }));
                }}
              >
                <SelectTrigger><SelectValue placeholder="Pilih jenis" /></SelectTrigger>
                <SelectContent>
                  {types.map((t) => <SelectItem key={t.id} value={t.id}>{t.nama}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="maps" className="flex items-center gap-1.5">
                <MapPin className="h-4 w-4 text-primary" /> Link Google Maps
              </Label>
              <div className="flex flex-col gap-2 sm:flex-row">
                <Input
                  id="maps"
                  placeholder="https://maps.google.com/..."
                  value={form.maps}
                  onChange={(e) => update("maps", e.target.value)}
                  className="flex-1"
                />
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      const parts = [
                        form.alamat,
                        wilayah?.kelurahan_nama,
                        wilayah?.kecamatan_nama,
                        wilayah?.kota_nama,
                        wilayah?.provinsi_nama,
                      ].filter(Boolean);
                      const q = parts.join(", ").trim();
                      const url = q
                        ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`
                        : `https://www.google.com/maps`;
                      window.open(url, "_blank", "noopener,noreferrer");
                    }}
                  >
                    <Search className="mr-1.5 h-4 w-4" /> Cari di Maps
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => {
                      if (!navigator.geolocation) {
                        toast.error("Browser tidak mendukung lokasi");
                        return;
                      }
                      const t = toast.loading("Mengambil lokasi...");
                      navigator.geolocation.getCurrentPosition(
                        (pos) => {
                          const { latitude, longitude } = pos.coords;
                          const link = `https://www.google.com/maps?q=${latitude},${longitude}`;
                          update("maps", link);
                          toast.dismiss(t);
                          toast.success("Lokasi berhasil diambil");
                        },
                        (err) => {
                          toast.dismiss(t);
                          toast.error(err.message || "Gagal mengambil lokasi");
                        },
                        { enableHighAccuracy: true, timeout: 10000 }
                      );
                    }}
                  >
                    <LocateFixed className="mr-1.5 h-4 w-4" /> Lokasi Saya
                  </Button>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="ktp">Foto KTP</Label>
              <label className="flex h-28 cursor-pointer items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border bg-muted/30 px-4 text-sm text-muted-foreground transition-colors hover:bg-muted/50">
                <Upload className="h-4 w-4" />
                <span className="truncate">{ktpFile ? ktpFile.name : "Klik untuk upload"}</span>
                <input id="ktp" type="file" accept="image/*" className="hidden" onChange={(e) => setKtpFile(e.target.files?.[0] ?? null)} />
              </label>
            </div>
            <div className="space-y-2">
              <Label htmlFor="rumah">Foto Rumah</Label>
              <label className="flex h-28 cursor-pointer items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border bg-muted/30 px-4 text-sm text-muted-foreground transition-colors hover:bg-muted/50">
                <Upload className="h-4 w-4" />
                <span className="truncate">{rumahFile ? rumahFile.name : "Klik untuk upload"}</span>
                <input id="rumah" type="file" accept="image/*" className="hidden" onChange={(e) => setRumahFile(e.target.files?.[0] ?? null)} />
              </label>
            </div>
          </CardContent>
        </Card>

        <div className="mt-6 flex justify-end gap-3">
          <Button type="button" variant="outline" onClick={() => navigate(-1)}>Batal</Button>
          <Button type="submit" disabled={submitting}>
            {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Simpan Pelanggan
          </Button>
        </div>
      </form>
    </div>
  );
}
