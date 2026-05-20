import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth, AppRole } from "@/hooks/useAuth";
import { logActivity } from "@/lib/logger";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Shield, ShieldOff } from "lucide-react";

interface UserRow { id: string; nama: string; email: string; role: AppRole | null; }

const ROLES: AppRole[] = ["ADMIN", "SALES", "TEKNISI", "VIEWER"];

export default function Users() {
  const { role: myRole } = useAuth();
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<UserRow[]>([]);

  useEffect(() => { document.title = "Manajemen User · DG-KOMPUTER"; }, []);

  const load = async () => {
    const [{ data: profs }, { data: roles }] = await Promise.all([
      supabase.from("profiles").select("id,nama,email"),
      supabase.from("user_roles").select("user_id,role"),
    ]);
    const map: Record<string, AppRole> = {};
    (roles ?? []).forEach((r: any) => { map[r.user_id] = r.role; });
    setRows(((profs ?? []) as any[]).map((p) => ({ id: p.id, nama: p.nama, email: p.email, role: map[p.id] ?? null })));
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const updateRole = async (uid: string, newRole: AppRole) => {
    // Use upsert to atomically update or insert the role, avoiding a delete+insert race
    const { error } = await supabase
      .from("user_roles")
      .upsert({ user_id: uid, role: newRole }, { onConflict: "user_id" });
    if (error) { toast.error("Gagal mengubah role", { description: error.message }); return; }
    await logActivity("ubah_role", `User role diubah ke ${newRole}`);
    toast.success(`Role diubah ke ${newRole}`);
    load();
  };

  if (myRole !== "ADMIN") {
    return (
      <Card className="border-border/60 shadow-card">
        <CardContent className="py-16 text-center">
          <ShieldOff className="mx-auto h-10 w-10 text-muted-foreground" />
          <p className="mt-3 text-sm text-muted-foreground">Hanya admin yang dapat mengakses halaman ini.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6 max-w-[1200px] mx-auto">
      <div>
        <h1 className="text-2xl font-display font-semibold flex items-center gap-2">
          <Shield className="h-6 w-6 text-primary" /> Manajemen User
        </h1>
        <p className="text-sm text-muted-foreground">{rows.length} user terdaftar — kelola role akses sistem</p>
      </div>

      <Card className="border-border/60 shadow-card overflow-hidden">
        {loading ? (
          <div className="space-y-2 p-4">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-14" />)}</div>
        ) : (
          <div className="overflow-x-auto scrollbar-thin">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-xs uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 text-left font-medium">User</th>
                  <th className="px-4 py-3 text-left font-medium">Email</th>
                  <th className="px-4 py-3 text-left font-medium">Role Saat Ini</th>
                  <th className="px-4 py-3 text-left font-medium">Ubah Role</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {rows.map((r) => (
                  <tr key={r.id} className="hover:bg-muted/30">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-hero text-xs font-semibold text-white">
                          {(r.nama || r.email).split(" ").map((s) => s[0]).join("").slice(0, 2).toUpperCase()}
                        </div>
                        <span className="font-medium">{r.nama || "—"}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{r.email}</td>
                    <td className="px-4 py-3"><Badge variant="outline">{r.role ?? "—"}</Badge></td>
                    <td className="px-4 py-3">
                      <Select value={r.role ?? ""} onValueChange={(v) => updateRole(r.id, v as AppRole)}>
                        <SelectTrigger className="w-36"><SelectValue placeholder="Pilih role" /></SelectTrigger>
                        <SelectContent>{ROLES.map((rr) => <SelectItem key={rr} value={rr}>{rr}</SelectItem>)}</SelectContent>
                      </Select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}