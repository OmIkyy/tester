import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Search, Plus, MapPin, Phone, ExternalLink } from "lucide-react";
import { SignedImage } from "@/components/SignedImage";
import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";

interface Customer {
  id: string;
  nama: string;
  nik: string | null;
  wa: string | null;
  alamat: string | null;
  area: string | null;
  paket: string | null;
  odp: string | null;
  maps: string | null;
  jenis: string | null;
  status: "Pending" | "Selesai";
  sales_id: string | null;
  foto_ktp: string | null;
  foto_rumah: string | null;
  created_at: string;
}

export default function Customers() {
  const navigate = useNavigate();
  const { role } = useAuth();
  const [loading, setLoading] = useState(true);
  const [list, setList] = useState<Customer[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [paketFilter, setPaketFilter] = useState<string>("all");
  const [areaFilter, setAreaFilter] = useState<string>("all");
  const [selected, setSelected] = useState<Customer | null>(null);

  useEffect(() => { document.title = "Pelanggan · DG-KOMPUTER"; }, []);

  const load = async () => {
    const { data } = await supabase.from("customers").select("*").order("created_at", { ascending: false });
    setList((data as Customer[]) ?? []);
    setLoading(false);
  };

  useEffect(() => {
    load();
    const ch = supabase
      .channel("customers-list")
      .on("postgres_changes", { event: "*", schema: "public", table: "customers" }, () => load())
      .subscribe();
    return () => { ch.unsubscribe(); };
  }, []);

  const paketOptions = useMemo(() => Array.from(new Set(list.map((c) => c.paket).filter(Boolean))) as string[], [list]);
  const areaOptions = useMemo(() => Array.from(new Set(list.map((c) => c.area).filter(Boolean))) as string[], [list]);

  const filtered = list.filter((c) => {
    if (statusFilter !== "all" && c.status !== statusFilter) return false;
    if (paketFilter !== "all" && c.paket !== paketFilter) return false;
    if (areaFilter !== "all" && c.area !== areaFilter) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      return [c.nama, c.nik, c.wa, c.alamat].some((v) => v?.toLowerCase().includes(q));
    }
    return true;
  });

  const canCreate = role === "ADMIN" || role === "SALES";

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-display font-semibold">Data Pelanggan</h1>
          <p className="text-sm text-muted-foreground">{filtered.length} dari {list.length} pelanggan</p>
        </div>
        {canCreate && (
          <Button onClick={() => navigate("/pelanggan/baru")}>
            <Plus className="mr-2 h-4 w-4" /> Pelanggan Baru
          </Button>
        )}
      </div>

      <Card className="border-border/60 shadow-card">
        <CardContent className="p-4">
          <div className="grid gap-3 md:grid-cols-4">
            <div className="relative md:col-span-2">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input className="pl-9" placeholder="Cari nama, NIK, no WA..." value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Status</SelectItem>
                <SelectItem value="Pending">Pending</SelectItem>
                <SelectItem value="Selesai">Selesai</SelectItem>
              </SelectContent>
            </Select>
            <div className="grid grid-cols-2 gap-2">
              <Select value={paketFilter} onValueChange={setPaketFilter}>
                <SelectTrigger><SelectValue placeholder="Paket" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Paket</SelectItem>
                  {paketOptions.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={areaFilter} onValueChange={setAreaFilter}>
                <SelectTrigger><SelectValue placeholder="Area" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Area</SelectItem>
                  {areaOptions.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-border/60 shadow-card overflow-hidden">
        {loading ? (
          <div className="space-y-2 p-4">
            {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-14" />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center text-sm text-muted-foreground">Tidak ada pelanggan ditemukan.</div>
        ) : (
          <div className="overflow-x-auto scrollbar-thin">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-xs uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 text-left font-medium">Pelanggan</th>
                  <th className="px-4 py-3 text-left font-medium">Paket</th>
                  <th className="px-4 py-3 text-left font-medium">Area</th>
                  <th className="px-4 py-3 text-left font-medium">Status</th>
                  <th className="px-4 py-3 text-left font-medium">Tanggal</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.map((c) => (
                  <tr key={c.id} onClick={() => setSelected(c)} className="cursor-pointer transition-colors hover:bg-muted/40">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary-soft text-xs font-semibold text-primary">
                          {c.nama.split(" ").map((s) => s[0]).join("").slice(0, 2).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <div className="font-medium truncate">{c.nama}</div>
                          <div className="text-xs text-muted-foreground truncate">{c.alamat ?? "—"}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{c.paket ?? "—"}</td>
                    <td className="px-4 py-3 text-muted-foreground">{c.area ?? "—"}</td>
                    <td className="px-4 py-3">
                      <Badge variant="outline" className={
                        c.status === "Selesai"
                          ? "border-success/30 bg-success/10 text-success"
                          : "border-warning/30 bg-warning/10 text-warning"
                      }>
                        {c.status}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground text-xs">
                      {format(new Date(c.created_at), "d MMM yyyy", { locale: localeId })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent className="max-w-2xl">
          {selected && (
            <>
              <DialogHeader>
                <DialogTitle className="font-display">{selected.nama}</DialogTitle>
                <DialogDescription>Detail pelanggan</DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 md:grid-cols-2">
                <DetailRow label="NIK" value={selected.nik} />
                <DetailRow label="No WhatsApp" value={selected.wa} icon={Phone} />
                <DetailRow label="Paket" value={selected.paket} />
                <DetailRow label="Jenis" value={selected.jenis} />
                <DetailRow label="Area" value={selected.area} />
                <DetailRow label="ODP" value={selected.odp} />
                <div className="md:col-span-2"><DetailRow label="Alamat" value={selected.alamat} icon={MapPin} /></div>
                <div className="md:col-span-2 flex items-center gap-2">
                  <Badge className={selected.status === "Selesai" ? "bg-success" : "bg-warning"}>{selected.status}</Badge>
                  {selected.maps && (
                    <a href={selected.maps} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs text-primary hover:underline">
                      <ExternalLink className="h-3 w-3" /> Buka Maps
                    </a>
                  )}
                </div>
                <PhotoBox label="Foto KTP" url={selected.foto_ktp} />
                <PhotoBox label="Foto Rumah" url={selected.foto_rumah} />
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function DetailRow({ label, value, icon: Icon }: { label: string; value: string | null; icon?: any }) {
  return (
    <div>
      <div className="text-xs text-muted-foreground uppercase tracking-wide">{label}</div>
      <div className="text-sm font-medium flex items-center gap-1.5 mt-0.5">
        {Icon && <Icon className="h-3.5 w-3.5 text-muted-foreground" />}
        {value ?? "—"}
      </div>
    </div>
  );
}

function PhotoBox({ label, url }: { label: string; url: string | null }) {
  return (
    <div>
      <div className="text-xs text-muted-foreground uppercase tracking-wide mb-1.5">{label}</div>
      <SignedImage path={url} alt={label} className="h-32 w-full" />
    </div>
  );
}