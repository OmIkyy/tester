import { useEffect, useMemo, useState } from "react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { logActivity } from "@/lib/logger";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { toast } from "sonner";
import { Loader2, UserCircle2, Mail, Shield, Activity, CheckCircle2, Clock } from "lucide-react";
import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";

const schema = z.object({
  nama: z.string().trim().min(2, "Nama minimal 2 karakter").max(120),
});

const roleColor: Record<string, string> = {
  ADMIN: "bg-primary text-primary-foreground",
  SALES: "bg-success text-success-foreground",
  TEKNISI: "bg-warning text-warning-foreground",
  VIEWER: "bg-muted text-muted-foreground",
};

export default function Profile() {
  const { user, profile, role, refresh } = useAuth();
  const [nama, setNama] = useState("");
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ total: 0, selesai: 0, pending: 0, last7: 0, lastAction: "—" });

  useEffect(() => { document.title = "Profil · DG-KOMPUTER"; }, []);
  useEffect(() => { setNama(profile?.nama ?? ""); }, [profile]);

  useEffect(() => {
    if (!user) return;
    (async () => {
      // Personal stats — depend on role:
      // SALES: customers they registered. TEKNISI: installations they handled.
      // ADMIN/VIEWER: aggregate all.
      let total = 0, selesai = 0, pending = 0, last7 = 0;
      const sevenAgo = new Date(Date.now() - 7 * 24 * 3600_000).toISOString();

      if (role === "TEKNISI") {
        const { data } = await supabase
          .from("installations")
          .select("id,created_at")
          .eq("teknisi_id", user.id);
        total = data?.length ?? 0;
        selesai = total;
        last7 = (data ?? []).filter((d: any) => d.created_at >= sevenAgo).length;
      } else {
        let q = supabase.from("customers").select("id,status,created_at");
        if (role === "SALES") q = q.eq("sales_id", user.id);
        const { data } = await q;
        total = data?.length ?? 0;
        selesai = (data ?? []).filter((d: any) => d.status === "Selesai").length;
        pending = total - selesai;
        last7 = (data ?? []).filter((d: any) => d.created_at >= sevenAgo).length;
      }

      const { data: lastLog } = await supabase
        .from("activity_logs")
        .select("action,created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      setStats({
        total,
        selesai,
        pending,
        last7,
        lastAction: lastLog
          ? `${lastLog.action.replace(/_/g, " ")} · ${format(new Date(lastLog.created_at), "d MMM HH:mm", { locale: localeId })}`
          : "Belum ada aktivitas",
      });
      setLoading(false);
    })();
  }, [user, role]);

  const initials = useMemo(
    () => (profile?.nama ?? profile?.email ?? "U").split(" ").map((s) => s[0]).join("").slice(0, 2).toUpperCase(),
    [profile]
  );

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    const parsed = schema.safeParse({ nama });
    if (!parsed.success) { toast.error(parsed.error.errors[0].message); return; }
    setSaving(true);
    const { error } = await supabase.from("profiles").update({ nama: parsed.data.nama }).eq("id", user.id);
    setSaving(false);
    if (error) { toast.error("Gagal simpan", { description: error.message }); return; }
    await logActivity("update_profile", "Memperbarui nama profil");
    toast.success("Profil diperbarui");
    refresh();
  };

  const statLabel =
    role === "TEKNISI" ? "Pemasangan Saya" :
    role === "SALES" ? "Pelanggan Saya" :
    "Total Pelanggan";

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div>
        <h1 className="text-2xl font-display font-semibold flex items-center gap-2">
          <UserCircle2 className="h-6 w-6 text-primary" /> Profil Saya
        </h1>
        <p className="text-sm text-muted-foreground">Kelola data akun dan lihat ringkasan kinerja Anda</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Identity card */}
        <Card className="lg:col-span-1 border-border/60 shadow-card">
          <CardContent className="p-6 text-center space-y-4">
            <Avatar className="h-20 w-20 mx-auto ring-4 ring-primary-soft">
              <AvatarFallback className="bg-gradient-hero text-xl font-semibold text-white">{initials}</AvatarFallback>
            </Avatar>
            <div>
              <div className="font-display text-lg font-semibold">{profile?.nama || "—"}</div>
              <div className="text-xs text-muted-foreground flex items-center justify-center gap-1 mt-0.5">
                <Mail className="h-3 w-3" /> {profile?.email}
              </div>
            </div>
            <div className="flex items-center justify-center gap-2 pt-1">
              <Shield className="h-3.5 w-3.5 text-muted-foreground" />
              <Badge className={`${roleColor[role ?? "VIEWER"]} font-medium tracking-wide`}>{role ?? "—"}</Badge>
            </div>
            <div className="rounded-lg bg-muted/50 p-3 text-left">
              <div className="text-xs uppercase tracking-wide text-muted-foreground mb-1">Aktivitas Terakhir</div>
              <div className="text-xs font-medium flex items-center gap-1.5">
                <Activity className="h-3.5 w-3.5 text-primary" /> {stats.lastAction}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Edit + stats */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="border-border/60 shadow-card">
            <CardHeader>
              <CardTitle className="text-base font-display">Informasi Akun</CardTitle>
              <CardDescription>Ubah nama tampilan Anda. Email & role hanya bisa diubah oleh admin.</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={save} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="nama">Nama Lengkap</Label>
                  <Input id="nama" value={nama} onChange={(e) => setNama(e.target.value)} maxLength={120} required />
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Email</Label>
                    <Input value={profile?.email ?? ""} disabled />
                  </div>
                  <div className="space-y-2">
                    <Label>Role</Label>
                    <Input value={role ?? ""} disabled />
                  </div>
                </div>
                <div className="flex justify-end pt-2">
                  <Button type="submit" disabled={saving}>
                    {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Simpan Perubahan
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          <Card className="border-border/60 shadow-card">
            <CardHeader>
              <CardTitle className="text-base font-display">Statistik Pribadi</CardTitle>
              <CardDescription>Ringkasan kontribusi Anda di sistem</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="grid gap-3 sm:grid-cols-4">
                  {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24" />)}
                </div>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  <MiniStat icon={Activity} label={statLabel} value={stats.total} tone="primary" />
                  <MiniStat icon={CheckCircle2} label="Selesai" value={stats.selesai} tone="success" />
                  {role !== "TEKNISI" && (
                    <MiniStat icon={Clock} label="Pending" value={stats.pending} tone="warning" />
                  )}
                  <MiniStat icon={Activity} label="7 Hari Terakhir" value={stats.last7} tone="primary" />
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function MiniStat({ icon: Icon, label, value, tone }: { icon: any; label: string; value: number; tone: "primary" | "success" | "warning" }) {
  const tones: Record<string, string> = {
    primary: "bg-primary-soft text-primary border-primary/20",
    success: "bg-success/10 text-success border-success/20",
    warning: "bg-warning/10 text-warning border-warning/20",
  };
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className={`inline-flex h-9 w-9 items-center justify-center rounded-lg border ${tones[tone]}`}>
        <Icon className="h-4 w-4" />
      </div>
      <div className="mt-3 text-2xl font-display font-semibold tabular-nums">{value.toLocaleString("id-ID")}</div>
      <div className="text-xs text-muted-foreground">{label}</div>
    </div>
  );
}