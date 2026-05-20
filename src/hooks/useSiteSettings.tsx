import { createContext, useContext, useEffect, useRef, useState, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface SiteSettings {
  site_name: string;
  site_title: string;
  site_description: string;
  footer_text: string;
  primary_color: string; // HSL triplet "H S% L%"
  logo_url: string | null;
  favicon_url: string | null;
  og_image_url: string | null;
}

const DEFAULTS: SiteSettings = {
  site_name: "DG-KOMPUTER",
  site_title: "DG-KOMPUTER - Sistem Manajemen Pelanggan",
  site_description: "Sistem manajemen pelanggan internet",
  footer_text: "© DG-KOMPUTER. All rights reserved.",
  primary_color: "222 80% 56%",
  logo_url: null,
  favicon_url: null,
  og_image_url: null,
};

interface Ctx {
  settings: SiteSettings;
  loading: boolean;
  refresh: () => Promise<void>;
}

const SiteSettingsContext = createContext<Ctx | undefined>(undefined);

function applyToDocument(s: SiteSettings) {
  // Title (default; pages may override via document.title)
  if (s.site_title) document.title = s.site_title;

  // Meta description
  let meta = document.querySelector('meta[name="description"]');
  if (!meta) {
    meta = document.createElement("meta");
    meta.setAttribute("name", "description");
    document.head.appendChild(meta);
  }
  meta.setAttribute("content", s.site_description);

  // OG title/description/image
  const setOg = (prop: string, content: string) => {
    let el = document.querySelector(`meta[property="${prop}"]`);
    if (!el) {
      el = document.createElement("meta");
      el.setAttribute("property", prop);
      document.head.appendChild(el);
    }
    el.setAttribute("content", content);
  };
  setOg("og:title", s.site_title);
  setOg("og:description", s.site_description);
  if (s.og_image_url) setOg("og:image", s.og_image_url);

  // Favicon
  if (s.favicon_url) {
    let link = document.querySelector("link[rel='icon']") as HTMLLinkElement | null;
    if (!link) {
      link = document.createElement("link");
      link.rel = "icon";
      document.head.appendChild(link);
    }
    link.href = s.favicon_url;
  }

  // Primary color via CSS variables
  if (s.primary_color) {
    document.documentElement.style.setProperty("--primary", s.primary_color);
    document.documentElement.style.setProperty("--ring", s.primary_color);
    document.documentElement.style.setProperty("--sidebar-primary", s.primary_color);
    document.documentElement.style.setProperty("--sidebar-ring", s.primary_color);
  }
}

export function SiteSettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<SiteSettings>(DEFAULTS);
  const [loading, setLoading] = useState(true);
  const mountedRef = useRef(true);

  const load = async () => {
    const { data } = await supabase
      .from("site_settings")
      .select("*")
      .eq("id", 1)
      .maybeSingle();
    if (!mountedRef.current) return;
    const merged: SiteSettings = { ...DEFAULTS, ...(data ?? {}) } as SiteSettings;
    setSettings(merged);
    applyToDocument(merged);
    setLoading(false);
  };

  useEffect(() => {
    mountedRef.current = true;
    load();
    const ch = supabase
      .channel(`site-settings-${Math.random().toString(36).slice(2, 8)}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "site_settings" },
        () => load()
      )
      .subscribe();
    return () => {
      mountedRef.current = false;
      supabase.removeChannel(ch);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <SiteSettingsContext.Provider value={{ settings, loading, refresh: load }}>
      {children}
    </SiteSettingsContext.Provider>
  );
}

export function useSiteSettings() {
  const ctx = useContext(SiteSettingsContext);
  if (!ctx) throw new Error("useSiteSettings must be used within SiteSettingsProvider");
  return ctx;
}