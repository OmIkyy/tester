import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface Package {
  id: string;
  nama: string;
  kecepatan_text: string;
  kecepatan_mbps: number | null;
  harga: number;
  deskripsi: string | null;
  warna: string | null;
  icon: string | null;
  urutan: number;
  aktif: boolean;
}

export interface CustomerType {
  id: string;
  nama: string;
  aktif: boolean;
  urutan: number;
}

export function usePackages(onlyActive = true) {
  const [items, setItems] = useState<Package[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    let q = supabase.from("packages").select("*").order("urutan", { ascending: true });
    if (onlyActive) q = q.eq("aktif", true);
    const { data } = await q;
    setItems((data as Package[]) ?? []);
    setLoading(false);
  };

  useEffect(() => {
    load();
    const ch = supabase
      .channel(`packages-${Math.random().toString(36).slice(2, 8)}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "packages" }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onlyActive]);

  return { items, loading, reload: load };
}

export function useCustomerTypes(onlyActive = true) {
  const [items, setItems] = useState<CustomerType[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    let q = supabase.from("customer_types").select("*").order("urutan", { ascending: true });
    if (onlyActive) q = q.eq("aktif", true);
    const { data } = await q;
    setItems((data as CustomerType[]) ?? []);
    setLoading(false);
  };

  useEffect(() => {
    load();
    const ch = supabase
      .channel(`customer-types-${Math.random().toString(36).slice(2, 8)}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "customer_types" }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onlyActive]);

  return { items, loading, reload: load };
}