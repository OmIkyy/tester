import { useEffect, useState } from "react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { logActivity } from "@/lib/logger";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Wrench, Upload, Loader as Loader2, MapPin, Phone, ExternalLink } from "lucide-react";

interface Customer {
  id: string; nama: string; alamat: string | null; area: string | null;
  paket: string | null; odp: string | null; wa: string | null; maps: string | null;
  status: "Pending" | "Selesai"; created_at: string;
}

const schema = z.object({
  onu: z.string().trim().min(1, "ONU wajib diisi").max(60),
  redaman: z.coerce.number().min(-100).max(0),
  kabel: z.coerce.number().int().min(0).max(10000),
});

export default function Queue() {
  const { user, role } = useAuth();
  const [loading, setLoading] = useState(true);
  const [list, setList] = useState<Customer[]>([]);
  const [active, setActive] = useState<Customer | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ onu: "", redaman: "", kabel: "" });
  const [foto, setFoto] = useState<File | null>(null);

  useEffect(() => { document.title = "Antrian Teknisi · DG-KOMPUTER"; }, []);

  const load = async () => {
    const { data } = await supabase.from("customers").select("*").eq("status", "Pending").order("created_at", { ascending: true });
    setList((data as Customer[]) ?? []);
    setLoading(false);
  };

  useEffect(() => {
    load();
    const ch = supabase.channel("queue").on("postgres_changes", { event: "*", schema: "public", table: "customers" }, () => load()).subscribe();
    return () => { ch.unsubscribe(); };
  }, []);

  const open = (c: Customer) => {
    setActive(c); setForm({ onu: "", redaman: "", kabel: "" }); setFoto(null);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!active || !user) return;
    const parse = schema.safeParse(form);
    if (!parse.success) { toast.error(parse.error.errors[0].message); return; }
    setSubmitting(true);
    let foto_onu: string | null = null;
    if (foto) {
      const ext = foto.name.split(".").pop();
      const path = `${user.id}/onu-${Date.now()}.${ext}`;
      const { error: uploadErr } = await supabase.storage.from("customer-photos").upload(path, foto);
      if (uploadErr) {
        toast.error("Upload foto ONU gagal", { description: uploadErr.message });
        setSubmitting(false);
        return;
      }
      foto_onu = path;
    }
    const { error: rpcErr } = await supabase.rpc("complete_installation", {
      _customer_id: active.id,
      _onu: parse.data.onu,
      _redaman: parse.data.redaman,
      _kabel: parse.data.kabel,
      _foto_onu: foto_onu,
    });
    setSubmitting(false);
    if (rpcErr) { toast.error("Gagal menyelesaikan pemasangan", { description: rpcErr.message }); return; }
    await logActivity("update_teknisi", `Pemasangan selesai untuk ${active.nama}`);
    toast.success("Pemasangan dicatat sebagai Selesai");
    setActive(null);
  };

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto">
      <div>
        <h1 className="text-2xl font-display font-semibold flex items-center gap-2">
          <Wrench className="h-6 w-6 text-warning" /> Antrian Teknisi
        </h1>
        <p className="text-sm text-muted-foreground">{list.length} pelanggan menunggu pemasangan</p>
      </div>

      {loading ? (
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-40" />)}
        </div>
      ) : list.length === 0 ? (
        <Card className="border-border/60 shadow-card">
          <CardContent className="py-16 text-center text-sm text-muted-foreground">
            🎉 Tidak ada antrian. Semua pelanggan sudah selesai dipasang.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {list.map((c) => (
            <Card key={c.id} className="border-border/60 shadow-card transition-all hover:-translate-y-0.5 hover:shadow-elevated">
              <CardContent className="p-5 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="font-medium truncate">{c.nama}</div>
                    <div className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                      <MapPin className="h-3 w-3" /> {c.area ?? "—"}
                    </div>
                  </div>
                  <Badge variant="outline" className="border-warning/30 bg-warning/10 text-warning shrink-0">Pending</Badge>
                </div>
                <div className="text-xs text-muted-foreground line-clamp-2">{c.alamat ?? "—"}</div>
                <div className="flex items-center gap-3 text-xs">
                  <span className="rounded-md bg-primary-soft px-2 py-1 text-primary font-medium">{c.paket ?? "—"}</span>
                  <span className="text-muted-foreground">ODP: {c.odp ?? "—"}</span>
                </div>
                <div className="flex flex-wrap gap-2 pt-2 border-t border-border">
                  {c.wa && (
                    <a href={`https://wa.me/${c.wa.replace(/\D/g, "")}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs text-primary hover:underline">
                      <Phone className="h-3 w-3" /> WA
                    </a>
                  )}
                  {c.maps && (
                    <a href={c.maps} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs text-primary hover:underline">
                      <ExternalLink className="h-3 w-3" /> Maps
                    </a>
                  )}
                  {(role === "TEKNISI" || role === "ADMIN") && (
                    <Button size="sm" className="ml-auto" onClick={() => open(c)}>Selesaikan</Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={!!active} onOpenChange={(o) => !o && setActive(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-display">Pemasangan: {active?.nama}</DialogTitle>
            <DialogDescription>Catat data pemasangan ONU & redaman</DialogDescription>
          </DialogHeader>
          <form onSubmit={submit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="onu">Type ONT *</Label>
              <Input id="onu" value={form.onu} onChange={(e) => setForm({ ...form, onu: e.target.value })} required />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="redaman">Redaman (dBm) *</Label>
                <Input id="redaman" type="number" step="0.01" placeholder="-25.5" min="-100" max="0" value={form.redaman} onChange={(e) => setForm({ ...form, redaman: e.target.value })} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="kabel">Panjang Kabel (m) *</Label>
                <Input id="kabel" type="number" value={form.kabel} onChange={(e) => setForm({ ...form, kabel: e.target.value })} required />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="foto-onu">Foto ONU</Label>
              <label className="flex h-24 cursor-pointer items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border bg-muted/30 px-4 text-sm text-muted-foreground transition-colors hover:border-primary/40 hover:bg-primary-soft/30">
                <Upload className="h-4 w-4" />
                <span className="truncate">{foto ? foto.name : "Klik untuk upload"}</span>
                <input id="foto-onu" type="file" accept="image/*" className="hidden" onChange={(e) => setFoto(e.target.files?.[0] ?? null)} />
              </label>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setActive(null)}>Batal</Button>
              <Button type="submit" disabled={submitting}>
                {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Simpan & Tandai Selesai
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
