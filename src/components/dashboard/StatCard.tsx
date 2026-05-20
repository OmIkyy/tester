import { Card } from "@/components/ui/card";
import { LucideIcon, TrendingUp, TrendingDown } from "lucide-react";
import { ResponsiveContainer, AreaChart, Area } from "recharts";

interface Props {
  label: string;
  value: string | number;
  delta?: number; // percent
  icon: LucideIcon;
  variant?: "default" | "hero";
  spark?: { v: number }[];
  hint?: string;
}

export function StatCard({ label, value, delta, icon: Icon, variant = "default", spark, hint }: Props) {
  const isHero = variant === "hero";
  const positive = (delta ?? 0) >= 0;

  return (
    <Card
      className={`relative overflow-hidden border-border/60 ${
        isHero
          ? "bg-gradient-hero text-white shadow-elevated md:col-span-2 md:row-span-1"
          : "bg-gradient-card shadow-card"
      } p-5 md:p-6 transition-transform hover:-translate-y-0.5`}
    >
      {isHero && (
        <>
          <div className="absolute -right-16 -top-16 h-48 w-48 rounded-full bg-white/10 blur-2xl" />
          <div className="absolute -bottom-20 -left-10 h-48 w-48 rounded-full bg-white/5 blur-2xl" />
        </>
      )}

      <div className="relative flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className={`text-xs font-medium uppercase tracking-wider ${isHero ? "text-white/80" : "text-muted-foreground"}`}>
            {label}
          </div>
          <div className={`mt-2 font-display font-semibold tabular-nums ${isHero ? "text-4xl md:text-5xl" : "text-3xl"}`}>
            {value}
          </div>
          {hint && (
            <div className={`mt-1 text-xs ${isHero ? "text-white/70" : "text-muted-foreground"}`}>{hint}</div>
          )}
          {typeof delta === "number" && (
            <div
              className={`mt-3 inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium ${
                isHero
                  ? "bg-white/15 text-white"
                  : positive
                  ? "bg-success/10 text-success"
                  : "bg-destructive/10 text-destructive"
              }`}
            >
              {positive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
              {positive ? "+" : ""}
              {delta.toFixed(1)}%
            </div>
          )}
        </div>
        <div
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${
            isHero ? "bg-white/15 text-white" : "bg-primary-soft text-primary"
          }`}
        >
          <Icon className="h-5 w-5" />
        </div>
      </div>

      {spark && spark.length > 1 && (
        <div className="relative mt-4 h-12">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={spark} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id={`spark-${label}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={isHero ? "#fff" : "hsl(var(--primary))"} stopOpacity={0.5} />
                  <stop offset="100%" stopColor={isHero ? "#fff" : "hsl(var(--primary))"} stopOpacity={0} />
                </linearGradient>
              </defs>
              <Area
                type="monotone"
                dataKey="v"
                stroke={isHero ? "#fff" : "hsl(var(--primary))"}
                strokeWidth={2}
                fill={`url(#spark-${label})`}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </Card>
  );
}