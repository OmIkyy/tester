import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  PieChart, Pie, Cell, Legend, BarChart, Bar,
} from "recharts";
import { BarChart3, PieChart as PieIcon, Users, MapPin } from "lucide-react";
import { format, subDays, startOfDay } from "date-fns";
import { id as localeId } from "date-fns/locale";

const COLORS = ["hsl(var(--primary))", "hsl(var(--success))", "hsl(var(--warning))", "hsl(var(--accent))", "hsl(var(--secondary))"];

export default function Statistics() {
  const { role } = useAuth();
  const [loading, setLoading] = useState(true);
  const [customers, setCustomers] = useState<any[]>([]);
  const [roleCounts, setRoleCounts] = useState<{ role: string; jumlah: number }[]>([]);

  useEffect(() => { document.title = "Statistik · DG-KOMPUTER"; }, []);

  useEffect(() => {
    (async () => {
      const [{ data: c }, { data: r }] = await Promise.all([
        supabase.from("customers").select("paket,area,status,created_at,jenis").limit(2000),
        role === "ADMIN" || role === "VIEWER"
          ? supabase.from("user_roles").select("role")
          : Promise.resolve({ data: [] as any[] }),
      ]);
      setCustomers(c ?? []);
      const counts: Record<string, number> = {};
      (r ?? []).forEach((row: any) => { counts[row.role] = (counts[row.role] ?? 0) + 1; });
      setRoleCounts(Object.entries(counts).map(([role, jumlah]) => ({ role, jumlah })));
      setLoading(false);
    })();
  }, [role]);

  const trend30 = useMemo(() => {
    const days = Array.from({ length: 30 }).map((_, i) => {
      const d = startOfDay(subDays(new Date(), 29 - i));
      return { date: d, label: format(d, "d/M", { locale: localeId }), baru: 0, selesai: 0 };
    });
    customers.forEach((c) => {
      const cd = startOfDay(new Date(c.created_at));
      const b = days.find((d) => d.date.getTime() === cd.getTime());
      if (b) { b.baru++; if (c.status === "Selesai") b.selesai++; }
    });
    return days.map(({ label, baru, selesai }) => ({ label, baru, selesai }));
  }, [customers]);

  const paketDist = useMemo(() => {
    const m: Record<string, number> = {};
    customers.forEach((c) => { const k = c.paket || "Tidak diset"; m[k] = (m[k] ?? 0) + 1; });
    return Object.entries(m).map(([name, value]) => ({ name, value }));
  }, [customers]);

  const topAreas = useMemo(() => {
    const m: Record<string, number> = {};
    customers.forEach((c) => { if (!c.area) return; m[c.area] = (m[c.area] ?? 0) + 1; });
    return Object.entries(m).map(([area, jumlah]) => ({ area, jumlah })).sort((a, b) => b.jumlah - a.jumlah).slice(0, 8);
  }, [customers]);

  const totalCust = customers.length;
  const ratio = totalCust > 0 ? Math.round((customers.filter((c) => c.status === "Selesai").length / totalCust) * 100) : 0;

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-72" />
        <div className="grid gap-4 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-72" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-display font-semibold flex items-center gap-2">
            <BarChart3 className="h-6 w-6 text-primary" /> Statistik
          </h1>
          <p className="text-sm text-muted-foreground">Analitik mendalam performa operasional NetCore</p>
        </div>
        <div className="flex gap-2">
          <Badge variant="outline" className="gap-1"><Users className="h-3 w-3" /> {totalCust} pelanggan</Badge>
          <Badge variant="outline" className="gap-1 border-success/30 text-success">{ratio}% completion</Badge>
        </div>
      </div>

      <Card className="border-border/60 shadow-card">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-display">Tren 30 Hari</CardTitle>
          <CardDescription>Pelanggan baru vs pemasangan selesai</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trend30} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="c1" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="c2" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(var(--success))" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="hsl(var(--success))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={false} allowDecimals={false} />
                <Tooltip contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: 12, fontSize: 12 }} />
                <Area type="monotone" dataKey="baru" name="Baru" stroke="hsl(var(--primary))" fill="url(#c1)" strokeWidth={2} />
                <Area type="monotone" dataKey="selesai" name="Selesai" stroke="hsl(var(--success))" fill="url(#c2)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="border-border/60 shadow-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-display flex items-center gap-2">
              <PieIcon className="h-4 w-4 text-primary" /> Distribusi Paket
            </CardTitle>
            <CardDescription>Pelanggan per jenis paket</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={paketDist} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} innerRadius={55} paddingAngle={2}>
                    {paketDist.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: 12, fontSize: 12 }} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/60 shadow-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-display flex items-center gap-2">
              <MapPin className="h-4 w-4 text-success" /> Top Area
            </CardTitle>
            <CardDescription>8 area dengan pelanggan terbanyak</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topAreas} layout="vertical" margin={{ top: 0, right: 10, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} allowDecimals={false} />
                  <YAxis dataKey="area" type="category" width={90} tick={{ fontSize: 11, fill: "hsl(var(--foreground))" }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: 12, fontSize: 12 }} />
                  <Bar dataKey="jumlah" name="Pelanggan" fill="hsl(var(--success))" radius={[0, 6, 6, 0]} barSize={14} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {(role === "ADMIN" || role === "VIEWER") && roleCounts.length > 0 && (
        <Card className="border-border/60 shadow-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-display">Distribusi Role User</CardTitle>
            <CardDescription>Komposisi tim berdasarkan peran sistem</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-4">
              {roleCounts.map((r, i) => (
                <div key={r.role} className="rounded-xl border border-border p-4">
                  <div className="text-xs text-muted-foreground uppercase tracking-wide">{r.role}</div>
                  <div className="mt-1 text-2xl font-display font-semibold tabular-nums" style={{ color: COLORS[i % COLORS.length] }}>
                    {r.jumlah}
                  </div>
                  <div className="text-xs text-muted-foreground">user terdaftar</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}