import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { StatCard } from "@/components/dashboard/StatCard";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Users, Wrench, CircleCheck as CheckCircle2, TrendingUp, UserPlus, ListChecks, FileText, Activity, Trophy } from "lucide-react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";
import { format, subDays, startOfDay } from "date-fns";
import { id as localeId } from "date-fns/locale";

interface Customer {
  id: string;
  nama: string;
  area: string | null;
  paket: string | null;
  status: "Pending" | "Selesai";
  sales_id: string | null;
  created_at: string;
}
interface Log {
  id: string;
  action: string;
  details: string | null;
  created_at: string;
  user_id: string | null;
}

export default function Dashboard() {
  const navigate = useNavigate();
  const { profile, role } = useAuth();
  const [loading, setLoading] = useState(true);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [logs, setLogs] = useState<Log[]>([]);
  const [salesProfiles, setSalesProfiles] = useState<Record<string, string>>({});

  useEffect(() => {
    document.title = "Dashboard · DG-KOMPUTER";
  }, []);

  const load = async () => {
    const [{ data: cust }, { data: lg }, { data: profs }] = await Promise.all([
      supabase.from("customers").select("id,nama,area,paket,status,sales_id,created_at").order("created_at", { ascending: false }).limit(500),
      supabase.from("activity_logs").select("id,action,details,created_at,user_id").order("created_at", { ascending: false }).limit(8),
      supabase.from("profiles").select("id,nama"),
    ]);
    setCustomers((cust as Customer[]) ?? []);
    setLogs((lg as Log[]) ?? []);
    const map: Record<string, string> = {};
    (profs ?? []).forEach((p: any) => { map[p.id] = p.nama; });
    setSalesProfiles(map);
    setLoading(false);
  };

  useEffect(() => {
    load();
    const channel = supabase
      .channel("dashboard-stream")
      .on("postgres_changes", { event: "*", schema: "public", table: "customers" }, () => load())
      .on("postgres_changes", { event: "*", schema: "public", table: "activity_logs" }, () => load())
      .subscribe();
    return () => { channel.unsubscribe(); };
  }, []);

  const stats = useMemo(() => {
    const total = customers.length;
    const pending = customers.filter((c) => c.status === "Pending").length;
    const done = total - pending;
    const today = startOfDay(new Date());
    const todayCount = customers.filter((c) => new Date(c.created_at) >= today).length;
    const ratio = total > 0 ? Math.round((done / total) * 100) : 0;
    return { total, pending, done, todayCount, ratio };
  }, [customers]);

  // Last 14 days trend
  const trend = useMemo(() => {
    const days = Array.from({ length: 14 }).map((_, i) => {
      const d = startOfDay(subDays(new Date(), 13 - i));
      return { date: d, label: format(d, "d MMM", { locale: localeId }), baru: 0, selesai: 0 };
    });
    customers.forEach((c) => {
      const created = startOfDay(new Date(c.created_at));
      const bucket = days.find((d) => d.date.getTime() === created.getTime());
      if (bucket) {
        bucket.baru++;
        if (c.status === "Selesai") bucket.selesai++;
      }
    });
    return days.map((d) => ({ label: d.label, baru: d.baru, selesai: d.selesai }));
  }, [customers]);

  // Sales ranking
  const ranking = useMemo(() => {
    const counts: Record<string, { pending: number; selesai: number }> = {};
    customers.forEach((c) => {
      if (!c.sales_id) return;
      counts[c.sales_id] = counts[c.sales_id] ?? { pending: 0, selesai: 0 };
      if (c.status === "Selesai") counts[c.sales_id].selesai++;
      else counts[c.sales_id].pending++;
    });
    return Object.entries(counts)
      .map(([uid, v]) => ({ uid, nama: salesProfiles[uid] ?? "Unknown", ...v, total: v.pending + v.selesai }))
      .sort((a, b) => b.selesai - a.selesai)
      .slice(0, 6);
  }, [customers, salesProfiles]);

  const sparkData = trend.map((t) => ({ v: t.baru }));

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-72" />
        <div className="grid gap-4 md:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-36" />)}
        </div>
        <div className="grid gap-4 lg:grid-cols-3">
          <Skeleton className="lg:col-span-2 h-80" />
          <Skeleton className="h-80" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 md:space-y-8 max-w-[1600px] mx-auto">
      {/* Header */}
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl md:text-3xl font-semibold font-display text-balance">
          Halo, {profile?.nama?.split(" ")[0] ?? "Tim"} 👋
        </h1>
        <p className="text-sm text-muted-foreground">
          Berikut ringkasan aktivitas operasional NetCore hari ini —{" "}
          {format(new Date(), "EEEE, d MMMM yyyy", { locale: localeId })}.
        </p>
      </div>

      {/* Hero stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <div className="md:col-span-2">
          <StatCard
            label="Total Pelanggan"
            value={stats.total.toLocaleString("id-ID")}
            delta={stats.todayCount > 0 ? ((stats.todayCount / Math.max(stats.total - stats.todayCount, 1)) * 100) : 0}
            icon={Users}
            variant="hero"
            spark={sparkData}
            hint={`${stats.todayCount} pelanggan baru hari ini`}
          />
        </div>
        <StatCard label="Antrian Pending" value={stats.pending} icon={Wrench} hint="Menunggu pemasangan" />
        <StatCard label="Selesai Pasang" value={stats.done} icon={CheckCircle2} hint={`${stats.ratio}% completion`} />
      </div>

      {/* Quick actions */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { icon: UserPlus, label: "Daftar Pelanggan", desc: "Tambah pelanggan baru", to: "/pelanggan/baru", roles: ["ADMIN", "SALES"] },
          { icon: Wrench, label: "Antrian Teknisi", desc: `${stats.pending} menunggu`, to: "/antrian", roles: ["ADMIN", "TEKNISI", "VIEWER"] },
          { icon: ListChecks, label: "Data Pelanggan", desc: "Lihat semua data", to: "/pelanggan", roles: ["ADMIN", "SALES", "TEKNISI", "VIEWER"] },
          { icon: FileText, label: "Rekap WhatsApp", desc: "Buat laporan", to: "/rekap", roles: ["ADMIN", "SALES", "VIEWER"] },
        ]
          .filter((q) => !role || q.roles.includes(role))
          .map((q) => (
            <button
              key={q.to}
              onClick={() => navigate(q.to)}
              className="group flex items-start gap-3 rounded-xl border border-border bg-card p-4 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-card"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary-soft text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                <q.icon className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <div className="font-medium text-sm">{q.label}</div>
                <div className="text-xs text-muted-foreground truncate">{q.desc}</div>
              </div>
            </button>
          ))}
      </div>

      {/* Charts row */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2 border-border/60 shadow-card">
          <CardHeader className="flex-row items-start justify-between gap-4 pb-4">
            <div>
              <CardTitle className="text-base font-display">Tren Pemasangan 14 Hari</CardTitle>
              <CardDescription>Pelanggan baru vs pemasangan selesai</CardDescription>
            </div>
            <Badge variant="outline" className="gap-1">
              <TrendingUp className="h-3 w-3" /> Live
            </Badge>
          </CardHeader>
          <CardContent>
            <div className="h-64 md:h-72">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trend} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="g1" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.4} />
                      <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                  <XAxis dataKey="label" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={false} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{
                      background: "hsl(var(--popover))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: 12,
                      fontSize: 12,
                    }}
                  />
                  <Line type="monotone" dataKey="baru" name="Baru" stroke="hsl(var(--primary))" strokeWidth={2.5} dot={{ r: 3 }} activeDot={{ r: 5 }} />
                  <Line type="monotone" dataKey="selesai" name="Selesai" stroke="hsl(var(--success))" strokeWidth={2.5} dot={{ r: 3 }} activeDot={{ r: 5 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/60 shadow-card">
          <CardHeader className="pb-4">
            <CardTitle className="text-base font-display flex items-center gap-2">
              <Trophy className="h-4 w-4 text-accent" /> Ranking Sales
            </CardTitle>
            <CardDescription>Berdasarkan pemasangan selesai</CardDescription>
          </CardHeader>
          <CardContent>
            {ranking.length === 0 ? (
              <p className="text-sm text-muted-foreground py-8 text-center">Belum ada data sales.</p>
            ) : (
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={ranking} layout="vertical" margin={{ top: 0, right: 8, left: -10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
                    <XAxis type="number" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} allowDecimals={false} />
                    <YAxis dataKey="nama" type="category" width={80} tick={{ fontSize: 11, fill: "hsl(var(--foreground))" }} axisLine={false} tickLine={false} />
                    <Tooltip
                      contentStyle={{
                        background: "hsl(var(--popover))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: 12,
                        fontSize: 12,
                      }}
                    />
                    <Bar dataKey="selesai" name="Selesai" fill="hsl(var(--primary))" radius={[0, 6, 6, 0]} barSize={14} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Progress + Recent activity */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="border-border/60 shadow-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-display">Rasio Pemasangan</CardTitle>
            <CardDescription>Selesai vs total pelanggan</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div>
              <div className="flex items-end justify-between mb-2">
                <span className="text-3xl font-display font-semibold tabular-nums">{stats.ratio}%</span>
                <span className="text-xs text-muted-foreground">{stats.done} / {stats.total}</span>
              </div>
              <Progress value={stats.ratio} className="h-2" />
            </div>
            <div className="grid grid-cols-2 gap-3 pt-2">
              <div className="rounded-lg bg-success/5 border border-success/20 p-3">
                <div className="text-xs text-muted-foreground">Selesai</div>
                <div className="text-xl font-semibold text-success tabular-nums">{stats.done}</div>
              </div>
              <div className="rounded-lg bg-warning/5 border border-warning/20 p-3">
                <div className="text-xs text-muted-foreground">Pending</div>
                <div className="text-xl font-semibold text-warning tabular-nums">{stats.pending}</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2 border-border/60 shadow-card">
          <CardHeader className="flex-row items-center justify-between pb-3">
            <div>
              <CardTitle className="text-base font-display flex items-center gap-2">
                <Activity className="h-4 w-4 text-primary" /> Aktivitas Terbaru
              </CardTitle>
              <CardDescription>Realtime activity logs</CardDescription>
            </div>
            <Button variant="ghost" size="sm" onClick={() => navigate("/logs")}>Lihat semua</Button>
          </CardHeader>
          <CardContent>
            {logs.length === 0 ? (
              <p className="text-sm text-muted-foreground py-8 text-center">Belum ada aktivitas.</p>
            ) : (
              <ol className="relative space-y-4 border-l border-border pl-5">
                {logs.map((log) => (
                  <li key={log.id} className="relative">
                    <span className="absolute -left-[26px] top-1 flex h-3 w-3 items-center justify-center">
                      <span className="absolute h-3 w-3 rounded-full bg-primary/20" />
                      <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                    </span>
                    <div className="flex flex-wrap items-baseline gap-2">
                      <span className="text-sm font-medium capitalize">{log.action}</span>
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(log.created_at), "d MMM HH:mm", { locale: localeId })}
                      </span>
                    </div>
                    {log.details && <p className="text-xs text-muted-foreground mt-0.5">{log.details}</p>}
                  </li>
                ))}
              </ol>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}