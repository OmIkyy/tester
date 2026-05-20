import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Image as ImageIcon } from "lucide-react";

interface Props {
  path: string | null;
  alt: string;
  className?: string;
  bucket?: string;
}

export function SignedImage({ path, alt, className, bucket = "customer-photos" }: Props) {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    if (!path) { setUrl(null); return; }
    // Backwards compat: if value is already a full URL, use it
    if (/^https?:\/\//i.test(path)) { setUrl(path); return; }
    supabase.storage.from(bucket).createSignedUrl(path, 60 * 60).then(({ data, error }) => {
      if (!cancelled) {
        if (error) {
          console.warn("Failed to create signed URL for", path, error);
          setUrl(null);
        } else {
          setUrl(data?.signedUrl ?? null);
        }
      }
    });
    return () => { cancelled = true; };
  }, [path, bucket]);

  if (!path) {
    return (
      <div className={`flex items-center justify-center rounded-lg border border-dashed border-border text-xs text-muted-foreground ${className ?? "h-32"}`}>
        <ImageIcon className="mr-1.5 h-3.5 w-3.5" /> Belum diupload
      </div>
    );
  }
  if (!url) {
    return <div className={`animate-pulse rounded-lg bg-muted ${className ?? "h-32"}`} />;
  }
  return (
    <a href={url} target="_blank" rel="noreferrer">
      <img src={url} alt={alt} loading="lazy" className={`rounded-lg object-cover border border-border ${className ?? "h-32 w-full"}`} />
    </a>
  );
}