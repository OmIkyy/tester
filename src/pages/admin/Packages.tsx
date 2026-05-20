import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { usePackages, Package } from "@/hooks/useMasterData";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { Plus, Edit, Trash2, Wifi, Loader2, Package as PackageIcon } from "lucide-react";

const schema = z.object({
  nama: z.string().trim().min(1, "Nama wajib").max(80),
  kecepatan_text: z.string().trim().min(1, "Kecepatan wajib").max(60),
  kecepatan_mbps: z.coerce.number().int().min(0).max(100000).optional(),
  harga: z.coerce.number().min(0).max(100000000),
  deskripsi: z.string().trim().max(280).optional().or(z.literal("")),
  warna: z.string().trim().regex(/^#[0-9a-fA-F]{6}$/, "Format hex").default("#3b82f6"),
  urutan: z.coerce.number().int().min(0).default(0),
  aktif: z.boolean().default(true),
});

type FormData = z.infer<typeof schema>;

const empty: FormData = { nama: "", kecepatan_text: "", kecepatan_mbps: 0, harga: 0, deskripsi: "", warna: "#3b82f6", urutan: 0, aktif: true };

export default function Packages() {
  const { role, loading: authLoading } = useAuth();
  const { items, loading } = usePackages(false);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Package | null>(null);
  const [confirmDel, setConfirmDel] = useState<Package | null>(null);
  const [form, setForm] = useState<FormData>(empty);
  const [saving, setSaving] = useState(false);

  useEffect(() => { document.title = "Paket Internet · Admin"; }, []);

  if (!authLoading && role !== "ADMIN") return <Navigate to="/" replace />;

  const openNew = () => { setEditing(null); setForm(empty); setOpen(true); };
  const openEdit = (p: Package) => {
    setEditing(p);
    setForm({
      nama: p.nama,
      kecepatan_text: p.kecepatan_text,
      kecepatan_mbps: p.kecepatan_mbps ?? 0,
      harga: Number(p.harga),
      deskripsi: p.deskripsi ?? "",
      warna: p.warna ?? "#3b82f6",
      urutan: p.urutan,
      aktif: p.aktif,
    });
    setOpen(true);
  };

  const save = async () => {
    const parsed = schema.safeParse(form);
    if (!parsed.success) { toast.error(parsed.error.errors[0].message); return; }
    setSaving(true);
    const payload = { ...parsed.data, deskripsi: parsed.data.deskripsi || null } as any;
    const { error } = editing
      ? await supabase.from("packages").update(payload).eq("id", editing.id)
      : await supabase.from("packages").insert(payload);
    setSaving(false);
    if (error) { toast.error("Gagal menyimpan", { description: error.message }); return; }
    toast.success(editing ? "Paket diperbarui" : "Paket ditambahkan");
    setOpen(false);
  };

  const remove = async () => {
    if (!confirmDel) return;
    const { error } = await supabase.from("packages").delete().eq("id", confirmDel.id);
    if (error) { toast.error("Gagal hapus", { description: error.message }); return; }
    toast.success("Paket dihapus");
    setConfirmDel(null);
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-display font-semibold flex items-center gap-2">
            <PackageIcon className="h-6 w-6 text-primary" /> Paket Internet
          </h1>
          <p className="text-sm text-muted-foreground">Kelola paket yang tersedia untuk pelanggan ({items.length} paket)</p>
        </div>
        <Button onClick={openNew}><Plus className="mr-2 h-4 w-4" /> Paket Baru</Button>
      </div>

      {loading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => <Card key={i} className="h-40 animate-pulse" />)}
        </div>
      ) : items.length === 0 ? (
        <Card className="border-dashed"><CardContent className="py-16 text-center text-sm text-muted-foreground">Belum ada paket. Klik "Paket Baru" untuk mulai.</CardContent></Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {items.map((p) => (
            <Card key={p.id} className="border-border/60 shadow-card hover:shadow-elevated transition-all">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg" style={{ background: `${p.warna}20`, color: p.warna ?? "#3b82f6" }}>
                      <Wifi className="h-5 w-5" />
                    </div>
                    <div>
                      <CardTitle className="text-base font-display">{p.nama}</CardTitle>
                      <div className="text-xs text-muted-foreground">{p.kecepatan_text}</div>
                    </div>
                  </div>
                  <Badge variant={p.aktif ? "default" : "outline"} className={p.aktif ? "bg-success/10 text-success border-success/20 hover:bg-success/10" : ""}>
                    {p.aktif ? "Aktif" : "Nonaktif"}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="text-2xl font-display font-semibold tabular-nums">
                  Rp {Number(p.harga).toLocaleString("id-ID")}<span className="text-sm font-normal text-muted-foreground">/bulan</span>
                </div>
                {p.deskripsi && <p className="text-xs text-muted-foreground line-clamp-2">{p.deskripsi}</p>}
                <div className="flex gap-2 pt-2">
                  <Button variant="outline" size="sm" className="flex-1" onClick={() => openEdit(p)}>
                    <Edit className="mr-1.5 h-3.5 w-3.5" /> Edit
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => setConfirmDel(p)}>
                    <Trash2 className="h-3.5 w-3.5 text-destructive" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Paket" : "Paket Baru"}</DialogTitle>
            <DialogDescription>Detail paket internet yang ditawarkan ke pelanggan.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2 md:col-span-2">
              <Label>Nama Paket *</Label>
              <Input value={form.nama} onChange={(e) => setForm({ ...form, nama: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Kecepatan (label) *</Label>
              <Input value={form.kecepatan_text} onChange={(e) => setForm({ ...form, kecepatan_text: e.target.value })} placeholder="100 Mbps Fiber" />
            </div>
            <div className="space-y-2">
              <Label>Kecepatan (Mbps untuk sort)</Label>
              <Input type="number" value={form.kecepatan_mbps} onChange={(e) => setForm({ ...form, kecepatan_mbps: +e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Harga / bulan *</Label>
              <Input type="number" value={form.harga} onChange={(e) => setForm({ ...form, harga: +e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Urutan tampil</Label>
              <Input type="number" value={form.urutan} onChange={(e) => setForm({ ...form, urutan: +e.target.value })} />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>Deskripsi</Label>
              <Textarea rows={2} value={form.deskripsi ?? ""} onChange={(e) => setForm({ ...form, deskripsi: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Warna</Label>
              <div className="flex gap-2">
                <input type="color" className="h-10 w-14 rounded border border-border cursor-pointer" value={form.warna} onChange={(e) => setForm({ ...form, warna: e.target.value })} />
                <Input value={form.warna} onChange={(e) => setForm({ ...form, warna: e.target.value })} />
              </div>
            </div>
            <div className="flex items-center justify-between rounded-lg border border-border p-3">
              <div>
                <div className="text-sm font-medium">Aktif</div>
                <div className="text-xs text-muted-foreground">Tampilkan di form pelanggan</div>
              </div>
              <Switch checked={form.aktif} onCheckedChange={(v) => setForm({ ...form, aktif: v })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Batal</Button>
            <Button onClick={save} disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Simpan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!confirmDel} onOpenChange={(o) => !o && setConfirmDel(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus paket "{confirmDel?.nama}"?</AlertDialogTitle>
            <AlertDialogDescription>Aksi ini tidak bisa dibatalkan. Pelanggan yang sudah pakai paket ini tetap aman, hanya referensinya akan dihapus.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction onClick={remove} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Hapus</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}