import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useCustomerTypes, CustomerType } from "@/hooks/useMasterData";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { Plus, Edit, Trash2, Tag, Loader2 } from "lucide-react";

const schema = z.object({
  nama: z.string().trim().min(1, "Nama wajib").max(60),
  urutan: z.coerce.number().int().min(0).default(0),
  aktif: z.boolean().default(true),
});
type FormData = z.infer<typeof schema>;
const empty: FormData = { nama: "", urutan: 0, aktif: true };

export default function CustomerTypes() {
  const { role, loading: authLoading } = useAuth();
  const { items, loading } = useCustomerTypes(false);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<CustomerType | null>(null);
  const [confirmDel, setConfirmDel] = useState<CustomerType | null>(null);
  const [form, setForm] = useState<FormData>(empty);
  const [saving, setSaving] = useState(false);

  useEffect(() => { document.title = "Jenis Pelanggan · Admin"; }, []);

  if (!authLoading && role !== "ADMIN") return <Navigate to="/" replace />;

  const openNew = () => { setEditing(null); setForm(empty); setOpen(true); };
  const openEdit = (it: CustomerType) => {
    setEditing(it);
    setForm({ nama: it.nama, urutan: it.urutan, aktif: it.aktif });
    setOpen(true);
  };

  const save = async () => {
    const parsed = schema.safeParse(form);
    if (!parsed.success) { toast.error(parsed.error.errors[0].message); return; }
    setSaving(true);
    const { error } = editing
      ? await supabase.from("customer_types").update(parsed.data as any).eq("id", editing.id)
      : await supabase.from("customer_types").insert(parsed.data as any);
    setSaving(false);
    if (error) { toast.error("Gagal menyimpan", { description: error.message }); return; }
    toast.success(editing ? "Jenis diperbarui" : "Jenis ditambahkan");
    setOpen(false);
  };

  const remove = async () => {
    if (!confirmDel) return;
    const { error } = await supabase.from("customer_types").delete().eq("id", confirmDel.id);
    if (error) { toast.error("Gagal hapus", { description: error.message }); return; }
    toast.success("Jenis dihapus");
    setConfirmDel(null);
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-display font-semibold flex items-center gap-2">
            <Tag className="h-6 w-6 text-primary" /> Jenis Pelanggan
          </h1>
          <p className="text-sm text-muted-foreground">Kelola kategori pelanggan ({items.length} jenis)</p>
        </div>
        <Button onClick={openNew}><Plus className="mr-2 h-4 w-4" /> Jenis Baru</Button>
      </div>

      <Card className="border-border/60 shadow-card overflow-hidden">
        {loading ? (
          <div className="p-4 text-center text-sm text-muted-foreground">Memuat…</div>
        ) : items.length === 0 ? (
          <CardContent className="py-16 text-center text-sm text-muted-foreground">Belum ada jenis pelanggan.</CardContent>
        ) : (
          <div className="divide-y divide-border">
            {items.map((it) => (
              <div key={it.id} className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-muted/40">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary-soft text-primary text-xs font-semibold">
                    {it.urutan}
                  </div>
                  <div className="min-w-0">
                    <div className="font-medium">{it.nama}</div>
                    <div className="text-xs text-muted-foreground">Urutan {it.urutan}</div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className={it.aktif ? "border-success/30 bg-success/10 text-success" : "text-muted-foreground"}>
                    {it.aktif ? "Aktif" : "Nonaktif"}
                  </Badge>
                  <Button variant="ghost" size="icon" onClick={() => openEdit(it)}><Edit className="h-4 w-4" /></Button>
                  <Button variant="ghost" size="icon" onClick={() => setConfirmDel(it)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Jenis" : "Jenis Baru"}</DialogTitle>
            <DialogDescription>Kategori pelanggan untuk klasifikasi.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Nama *</Label>
              <Input value={form.nama} onChange={(e) => setForm({ ...form, nama: e.target.value })} placeholder="Rumah, Bisnis, Sekolah..." />
            </div>
            <div className="space-y-2">
              <Label>Urutan</Label>
              <Input type="number" value={form.urutan} onChange={(e) => setForm({ ...form, urutan: +e.target.value })} />
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
            <AlertDialogTitle>Hapus jenis "{confirmDel?.nama}"?</AlertDialogTitle>
            <AlertDialogDescription>Aksi tidak bisa dibatalkan.</AlertDialogDescription>
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