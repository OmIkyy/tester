import { useState } from "react";
import { Calendar as CalendarIcon } from "lucide-react";
import { format, subDays, startOfDay, endOfDay } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

export type RangePreset = "today" | "7d" | "30d" | "365d" | "custom";

export interface DateRange { from: Date; to: Date; }

export function presetRange(p: RangePreset): DateRange {
  const now = new Date();
  const to = endOfDay(now);
  switch (p) {
    case "today": return { from: startOfDay(now), to };
    case "7d": return { from: startOfDay(subDays(now, 6)), to };
    case "30d": return { from: startOfDay(subDays(now, 29)), to };
    case "365d": return { from: startOfDay(subDays(now, 364)), to };
    default: return { from: startOfDay(subDays(now, 29)), to };
  }
}

const PRESETS: { value: RangePreset; label: string }[] = [
  { value: "today", label: "Hari ini" },
  { value: "7d", label: "7 hari" },
  { value: "30d", label: "30 hari" },
  { value: "365d", label: "1 tahun" },
];

export function DateRangeFilter({
  preset, range, onChange,
}: {
  preset: RangePreset;
  range: DateRange;
  onChange: (preset: RangePreset, range: DateRange) => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="inline-flex rounded-lg border border-border bg-card p-0.5">
        {PRESETS.map((p) => (
          <button
            key={p.value}
            type="button"
            onClick={() => onChange(p.value, presetRange(p.value))}
            className={cn(
              "px-3 py-1.5 text-xs font-medium rounded-md transition-colors",
              preset === p.value
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:bg-muted"
            )}
          >
            {p.label}
          </button>
        ))}
      </div>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant={preset === "custom" ? "default" : "outline"}
            size="sm"
            className="h-8"
          >
            <CalendarIcon className="mr-2 h-3.5 w-3.5" />
            {preset === "custom"
              ? `${format(range.from, "d MMM", { locale: localeId })} – ${format(range.to, "d MMM yyyy", { locale: localeId })}`
              : "Custom"}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="end">
          <Calendar
            mode="range"
            defaultMonth={range.from}
            selected={{ from: range.from, to: range.to }}
            onSelect={(r) => {
              if (r?.from && r?.to) {
                onChange("custom", { from: startOfDay(r.from), to: endOfDay(r.to) });
                setOpen(false);
              }
            }}
            numberOfMonths={1}
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}