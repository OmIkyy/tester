import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollText } from "lucide-react";
import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";

interface Log { id: string; action: string; details: string | null; created_at: string; user_id: string | null; }

export default function Logs() {
  const [loading, setLoading] = useState(true);
  const [logs, setLogs] = useState<Log[]>([]);
  const [names, setNames] = useState<Record<string, string>>({});

  useEffect(() => { document.title = "Log Aktivitas · DG-KOMPUTER"; }, []);

  useEffect(() => {
    const load = async () => {
      const [{ data: l }, { data: p }] = await Promise.all([
        supabase.from("activity_logs").select("*").order("created_at", { ascending: false }).limit(200),
        supabase.from("profiles").select("id,nama"),
      ]);
      setLogs((l as Log[]) ?? []);
      const map: Record<string, string> = {};
      (p ?? []).forEach((x: any) => { map[x.id] = x.nama; });
      setNames(map);
      setLoading(false);
    };
    load();
    const ch = supabase.channel("logs").on("postgres_changes", { event: "*", schema: "public", table: "activity_logs" }, () => load()).subscribe();
    return () => { ch.unsubscribe(); };
  }, []);

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-display font-semibold flex items-center gap-2">
          <ScrollText className="h-6 w-6 text-primary" /> Log Aktivitas
        </h1>
        <p className="text-sm text-muted-foreground">Timeline semua aktivitas sistem</p>
      </div>
      <Card className="border-border/60 shadow-card">
        <CardContent className="p-6">
          {loading ? (
            <div className="space-y-3">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-12" />)}</div>
          ) : logs.length === 0 ? (
            <p className="text-center text-sm text-muted-foreground py-8">Belum ada aktivitas.</p>
          ) : (
            <ol className="relative space-y-5 border-l border-border pl-6">
              {logs.map((log) => (
                <li key={log.id} className="relative">
                  <span className="absolute -left-[30px] top-1 flex h-3 w-3 items-center justify-center">
                    <span className="absolute h-3 w-3 rounded-full bg-primary/20" />
                    <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                  </span>
                  <div className="flex flex-wrap items-baseline gap-2">
                    <span className="text-sm font-medium capitalize">{log.action.replace(/_/g, " ")}</span>
                    <span className="text-xs text-muted-foreground">oleh {names[log.user_id ?? ""] ?? "—"}</span>
                    <span className="text-xs text-muted-foreground ml-auto">
                      {format(new Date(log.created_at), "d MMM yyyy · HH:mm", { locale: localeId })}
                    </span>
                  </div>
                  {log.details && <p className="text-xs text-muted-foreground mt-1">{log.details}</p>}
                </li>
              ))}
            </ol>
          )}
        </CardContent>
      </Card>
    </div>
  );
}