import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useSiteSettings } from "@/hooks/useSiteSettings";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { Loader2, Settings2, Upload, Image as ImageIcon, Palette, Trash2 } from "lucide-react";

const schema = z.object({
  site_name: z.string().trim().min(1).max(80),
  site_title: z.string().trim().min(1).max(120),
  site_description: z.string().trim().min(1).max(280),
  footer_text: z.string().trim().min(1).max(280),
  primary_color: z.string().trim().regex(/^\d{1,3}\s+\d{1,3}%\s+\d{1,3}%$/, "Format: H S% L% (mis. 222 80% 56%)"),
});

function hexToHsl(hex: string): string | null {
  const m = hex.replace("#", "").match(/^([0-9a-f]{6})$/i);
  if (!m) return null;
  const num = parseInt(m[1], 16);
  const r = ((num >> 16) & 255) / 255;
  const g = ((num >> 8) & 255) / 255;
  const b = (num & 255) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0; const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h *= 60;
  }
  return `${Math.round(h)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
}

function hslToHex(hsl: string): string {
  const m = hsl.match(/(\d+)\s+(\d+)%\s+(\d+)%/);
  if (!m) return "#3b82f6";
  const h = +m[1] / 360, s = +m[2] / 100, l = +m[3] / 100;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => {
    const k = (n + h * 12) % 12;
    const v = l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1));
    return Math.round(v * 255).toString(16).padStart(2, "0");
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}

export default function Settings() {
  const { role, loading: authLoading } = useAuth();
  const { settings, refresh } = useSiteSettings();
  const [form, setForm] = useState(settings);
  const [saving, setSaving] = useState(false);

  useEffect(() => { document.title = "Pengaturan Website · Admin"; }, []);
  useEffect(() => { setForm(settings); }, [settings]);

  if (!authLoading && role !== "ADMIN") return <Navigate to="/" replace />;

  const update = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const uploadFile = async (file: File, kind: "logo" | "favicon" | "og") => {
    const ext = file.name.split(".").pop() ?? "png";
    const path = `${kind}-${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("branding").upload(path, file, { upsert: true });
    if (error) { toast.error(`Upload ${kind} gagal`, { description: error.message }); return null; }
    const { data } = supabase.storage.from("branding").getPublicUrl(path);
    return data.publicUrl;
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>, kind: "logo" | "favicon" | "og") => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = await uploadFile(file, kind);
    if (!url) return;
    if (kind === "logo") update("logo_url", url);
    if (kind === "favicon") update("favicon_url", url);
    if (kind === "og") update("og_image_url", url);
    toast.success("Berhasil upload");
    e.target.value = "";
  };

  const save = async () => {
    const parsed = schema.safeParse(form);
    if (!parsed.success) { toast.error(parsed.error.errors[0].message); return; }
    setSaving(true);
    const { error } = await supabase
      .from("site_settings")
      .update({
        ...parsed.data,
        logo_url: form.logo_url,
        favicon_url: form.favicon_url,
        og_image_url: form.og_image_url,
      })
      .eq("id", 1);
    setSaving(false);
    if (error) { toast.error("Gagal menyimpan", { description: error.message }); return; }
    toast.success("Pengaturan disimpan");
    refresh();
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div>
        <h1 className="text-2xl font-display font-semibold flex items-center gap-2">
          <Settings2 className="h-6 w-6 text-primary" /> Pengaturan Website
        </h1>
        <p className="text-sm text-muted-foreground">Branding & identitas website. Perubahan tersinkron real-time ke semua user.</p>
      </div>

      <Tabs defaultValue="general" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3 max-w-md">
          <TabsTrigger value="general">Umum</TabsTrigger>
          <TabsTrigger value="branding">Branding</TabsTrigger>
          <TabsTrigger value="appearance">Tampilan</TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="space-y-4">
          <Card className="border-border/60 shadow-card">
            <CardHeader>
              <CardTitle className="text-base font-display">Informasi Website</CardTitle>
              <CardDescription>Nama, judul, dan deskripsi yang muncul di tab browser & meta SEO.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Nama Website</Label>
                <Input value={form.site_name} onChange={(e) => update("site_name", e.target.value)} maxLength={80} />
              </div>
              <div className="space-y-2">
                <Label>Title (browser tab)</Label>
                <Input value={form.site_title} onChange={(e) => update("site_title", e.target.value)} maxLength={120} />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label>Deskripsi</Label>
                <Textarea rows={2} value={form.site_description} onChange={(e) => update("site_description", e.target.value)} maxLength={280} />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label>Footer Text</Label>
                <Input value={form.footer_text} onChange={(e) => update("footer_text", e.target.value)} maxLength={280} />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="branding" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <BrandingSlot
              label="Logo Website"
              hint="PNG/SVG, transparan disarankan"
              url={form.logo_url}
              onUpload={(e) => handleUpload(e, "logo")}
              onRemove={() => update("logo_url", null)}
            />
            <BrandingSlot
              label="Favicon"
              hint="ICO/PNG 32×32 atau 64×64"
              url={form.favicon_url}
              onUpload={(e) => handleUpload(e, "favicon")}
              onRemove={() => update("favicon_url", null)}
              small
            />
            <BrandingSlot
              label="OG Image (share)"
              hint="1200×630 untuk preview share"
              url={form.og_image_url}
              onUpload={(e) => handleUpload(e, "og")}
              onRemove={() => update("og_image_url", null)}
            />
          </div>
        </TabsContent>

        <TabsContent value="appearance" className="space-y-4">
          <Card className="border-border/60 shadow-card">
            <CardHeader>
              <CardTitle className="text-base font-display flex items-center gap-2">
                <Palette className="h-4 w-4" /> Warna Primary
              </CardTitle>
              <CardDescription>Warna utama untuk tombol, link, dan aksen.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-4">
                <input
                  type="color"
                  className="h-12 w-16 rounded-md border border-border cursor-pointer"
                  value={hslToHex(form.primary_color)}
                  onChange={(e) => {
                    const hsl = hexToHsl(e.target.value);
                    if (hsl) update("primary_color", hsl);
                  }}
                />
                <div className="flex-1 space-y-2">
                  <Label>HSL Value</Label>
                  <Input
                    value={form.primary_color}
                    onChange={(e) => update("primary_color", e.target.value)}
                    placeholder="222 80% 56%"
                  />
                </div>
              </div>
              <Separator />
              <div className="space-y-2">
                <Label className="text-xs uppercase tracking-wide text-muted-foreground">Preview</Label>
                <div
                  className="rounded-xl p-6 text-white"
                  style={{ background: `hsl(${form.primary_color})` }}
                >
                  <div className="text-lg font-semibold">{form.site_name || "Preview"}</div>
                  <div className="text-sm opacity-90">{form.site_description}</div>
                </div>
                <div className="flex gap-2 pt-2">
                  <Button style={{ background: `hsl(${form.primary_color})` }}>Tombol Primary</Button>
                  <Button variant="outline" style={{ borderColor: `hsl(${form.primary_color})`, color: `hsl(${form.primary_color})` }}>Outline</Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <div className="sticky bottom-4 flex justify-end">
        <Button onClick={save} disabled={saving} size="lg" className="shadow-elevated">
          {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Simpan Pengaturan
        </Button>
      </div>
    </div>
  );
}

function BrandingSlot({
  label, hint, url, onUpload, onRemove, small,
}: {
  label: string; hint: string; url: string | null;
  onUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onRemove: () => void;
  small?: boolean;
}) {
  return (
    <Card className="border-border/60 shadow-card">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium">{label}</CardTitle>
        <CardDescription className="text-xs">{hint}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className={`relative flex ${small ? "h-24" : "h-36"} items-center justify-center rounded-lg border border-dashed border-border bg-muted/30 overflow-hidden`}>
          {url ? (
            <img src={url} alt={label} className="max-h-full max-w-full object-contain" />
          ) : (
            <div className="text-xs text-muted-foreground flex flex-col items-center gap-1">
              <ImageIcon className="h-6 w-6" /> Belum ada
            </div>
          )}
        </div>
        <div className="flex gap-2">
          <label className="flex-1">
            <input type="file" accept="image/*" className="hidden" onChange={onUpload} />
            <Button asChild variant="outline" size="sm" className="w-full cursor-pointer">
              <span><Upload className="mr-1.5 h-3.5 w-3.5" /> Upload</span>
            </Button>
          </label>
          {url && (
            <Button variant="outline" size="sm" onClick={onRemove}>
              <Trash2 className="h-3.5 w-3.5 text-destructive" />
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}