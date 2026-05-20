import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { FileSpreadsheet, Download } from "lucide-react";
import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";
import * as XLSX from "xlsx";

export default function Recap() {
  const [customers, setCustomers] = useState<any[]>([]);
  const [profiles, setProfiles] = useState<Record<string, string>>({});

  useEffect(() => {
    document.title = "Rekap Excel · DG-KOMPUTER";
    (async () => {
      const [{ data: c }, { data: p }] = await Promise.all([
        supabase.from("customers").select("nama,area,paket,status,sales_id,created_at"),
        supabase.from("profiles").select("id,nama"),
      ]);
      setCustomers(c ?? []);
      const m: Record<string, string> = {};
      (p ?? []).forEach((x: any) => { m[x.id] = x.nama; });
      setProfiles(m);
    })();
  }, []);

  const stats = useMemo(() => {
    const total = customers.length;
    const pending = customers.filter((c) => c.status === "Pending");
    const selesai = customers.filter((c) => c.status === "Selesai");
    const bySales: Record<string, { selesai: number; pending: number }> = {};
    customers.forEach((c) => {
      if (!c.sales_id) return;
      bySales[c.sales_id] = bySales[c.sales_id] ?? { selesai: 0, pending: 0 };
      if (c.status === "Selesai") bySales[c.sales_id].selesai++; else bySales[c.sales_id].pending++;
    });
    return { total, pending, selesai, bySales };
  }, [customers]);

  const downloadExcel = () => {
    const today = format(new Date(), "d MMMM yyyy", { locale: localeId });
    const fileDate = format(new Date(), "yyyy-MM-dd");
    const wb = XLSX.utils.book_new();

    // ---------- Sheet 1: Ringkasan ----------
    const ringkasan: any[][] = [
      ["REKAP DG-KOMPUTER"],
      [today],
      [],
      ["Ringkasan", "Jumlah"],
      ["Total pelanggan", stats.total],
      ["Selesai pasang", stats.selesai.length],
      ["Antrian pending", stats.pending.length],
    ];
    const wsR = XLSX.utils.aoa_to_sheet(ringkasan);
    wsR["!cols"] = [{ wch: 28 }, { wch: 14 }];
    wsR["!merges"] = [
      { s: { r: 0, c: 0 }, e: { r: 0, c: 1 } },
      { s: { r: 1, c: 0 }, e: { r: 1, c: 1 } },
    ];
    // Title
    if (wsR["A1"]) wsR["A1"].s = {
      font: { bold: true, sz: 16, color: { rgb: "FFFFFF" } },
      fill: { fgColor: { rgb: "1F4E78" } },
      alignment: { horizontal: "center", vertical: "center" },
    };
    if (wsR["A2"]) wsR["A2"].s = {
      font: { italic: true, color: { rgb: "555555" } },
      alignment: { horizontal: "center" },
    };
    // Header row (row 4 -> A4,B4)
    ["A4", "B4"].forEach((a) => {
      if (wsR[a]) wsR[a].s = {
        font: { bold: true, color: { rgb: "FFFFFF" } },
        fill: { fgColor: { rgb: "2E75B6" } },
        alignment: { horizontal: "center" },
        border: thinBorder(),
      };
    });
    // Data rows
    for (let r = 4; r <= 6; r++) {
      const aCell = `A${r + 1}`;
      const bCell = `B${r + 1}`;
      const fill = r % 2 === 0 ? "DEEBF7" : "FFFFFF";
      if (wsR[aCell]) wsR[aCell].s = { fill: { fgColor: { rgb: fill } }, border: thinBorder() };
      if (wsR[bCell]) wsR[bCell].s = { fill: { fgColor: { rgb: fill } }, border: thinBorder(), alignment: { horizontal: "right" }, font: { bold: true } };
    }
    XLSX.utils.book_append_sheet(wb, wsR, "Ringkasan");

    // ---------- Sheet 2: Per Sales ----------
    const salesRows = Object.entries(stats.bySales)
      .sort((a, b) => b[1].selesai - a[1].selesai)
      .map(([uid, v]) => [profiles[uid] ?? "Unknown", v.selesai, v.pending, v.selesai + v.pending]);
    const perSales: any[][] = [
      ["REKAP PER SALES"],
      [today],
      [],
      ["Sales", "Selesai", "Pending", "Total"],
      ...salesRows,
    ];
    const wsS = XLSX.utils.aoa_to_sheet(perSales);
    wsS["!cols"] = [{ wch: 28 }, { wch: 12 }, { wch: 12 }, { wch: 12 }];
    wsS["!merges"] = [
      { s: { r: 0, c: 0 }, e: { r: 0, c: 3 } },
      { s: { r: 1, c: 0 }, e: { r: 1, c: 3 } },
    ];
    if (wsS["A1"]) wsS["A1"].s = {
      font: { bold: true, sz: 16, color: { rgb: "FFFFFF" } },
      fill: { fgColor: { rgb: "1F4E78" } },
      alignment: { horizontal: "center", vertical: "center" },
    };
    if (wsS["A2"]) wsS["A2"].s = { font: { italic: true, color: { rgb: "555555" } }, alignment: { horizontal: "center" } };
    ["A4", "B4", "C4", "D4"].forEach((a) => {
      if (wsS[a]) wsS[a].s = {
        font: { bold: true, color: { rgb: "FFFFFF" } },
        fill: { fgColor: { rgb: "2E75B6" } },
        alignment: { horizontal: "center" },
        border: thinBorder(),
      };
    });
    salesRows.forEach((_, i) => {
      const row = i + 5;
      const fill = i % 2 === 0 ? "DEEBF7" : "FFFFFF";
      ["A", "B", "C", "D"].forEach((col, idx) => {
        const cell = `${col}${row}`;
        if (wsS[cell]) wsS[cell].s = {
          fill: { fgColor: { rgb: fill } },
          border: thinBorder(),
          alignment: { horizontal: idx === 0 ? "left" : "right" },
        };
      });
    });
    XLSX.utils.book_append_sheet(wb, wsS, "Per Sales");

    // ---------- Sheet 3: Antrian Pending ----------
    const pendingRows = stats.pending.map((c, i) => [
      i + 1,
      c.nama ?? "-",
      c.area ?? "-",
      c.paket ?? "-",
      profiles[c.sales_id] ?? "-",
    ]);
    const antrian: any[][] = [
      ["ANTRIAN TEKNISI (PENDING)"],
      [today],
      [],
      ["No", "Nama Pelanggan", "Area", "Paket", "Sales"],
      ...pendingRows,
    ];
    const wsP = XLSX.utils.aoa_to_sheet(antrian);
    wsP["!cols"] = [{ wch: 5 }, { wch: 28 }, { wch: 18 }, { wch: 18 }, { wch: 20 }];
    wsP["!merges"] = [
      { s: { r: 0, c: 0 }, e: { r: 0, c: 4 } },
      { s: { r: 1, c: 0 }, e: { r: 1, c: 4 } },
    ];
    if (wsP["A1"]) wsP["A1"].s = {
      font: { bold: true, sz: 16, color: { rgb: "FFFFFF" } },
      fill: { fgColor: { rgb: "C00000" } },
      alignment: { horizontal: "center", vertical: "center" },
    };
    if (wsP["A2"]) wsP["A2"].s = { font: { italic: true, color: { rgb: "555555" } }, alignment: { horizontal: "center" } };
    ["A4", "B4", "C4", "D4", "E4"].forEach((a) => {
      if (wsP[a]) wsP[a].s = {
        font: { bold: true, color: { rgb: "FFFFFF" } },
        fill: { fgColor: { rgb: "E97132" } },
        alignment: { horizontal: "center" },
        border: thinBorder(),
      };
    });
    pendingRows.forEach((_, i) => {
      const row = i + 5;
      const fill = i % 2 === 0 ? "FCE4D6" : "FFFFFF";
      ["A", "B", "C", "D", "E"].forEach((col, idx) => {
        const cell = `${col}${row}`;
        if (wsP[cell]) wsP[cell].s = {
          fill: { fgColor: { rgb: fill } },
          border: thinBorder(),
          alignment: { horizontal: idx === 0 ? "center" : "left" },
        };
      });
    });
    XLSX.utils.book_append_sheet(wb, wsP, "Antrian Pending");

    XLSX.writeFile(wb, `Rekap-DG-KOMPUTER-${fileDate}.xlsx`, { cellStyles: true });
    toast.success("File Excel berhasil diunduh");
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-display font-semibold flex items-center gap-2">
          <FileSpreadsheet className="h-6 w-6 text-success" /> Rekap Excel
        </h1>
        <p className="text-sm text-muted-foreground">Generate laporan rekap lengkap dalam file Excel berwarna</p>
      </div>
      <Card className="border-border/60 shadow-card">
        <CardHeader>
          <CardTitle className="text-base font-display">Ringkasan Data</CardTitle>
          <CardDescription>File Excel berisi 3 sheet: Ringkasan, Per Sales, dan Antrian Pending</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <StatBox label="Total Pelanggan" value={stats.total} tone="bg-primary/10 text-primary" />
            <StatBox label="Selesai Pasang" value={stats.selesai.length} tone="bg-success/10 text-success" />
            <StatBox label="Antrian Pending" value={stats.pending.length} tone="bg-destructive/10 text-destructive" />
          </div>
          <div className="flex justify-end">
            <Button onClick={downloadExcel}><Download className="mr-2 h-4 w-4" /> Download Excel</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function StatBox({ label, value, tone }: { label: string; value: number; tone: string }) {
  return (
    <div className={`rounded-lg p-4 ${tone}`}>
      <div className="text-xs font-medium opacity-80">{label}</div>
      <div className="text-2xl font-bold mt-1">{value}</div>
    </div>
  );
}

function thinBorder() {
  const s = { style: "thin", color: { rgb: "BFBFBF" } } as const;
  return { top: s, bottom: s, left: s, right: s };
}
