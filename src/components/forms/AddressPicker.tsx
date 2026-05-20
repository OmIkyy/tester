import { useEffect, useState } from "react";
import { Check, ChevronsUpDown, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

import { cn } from "@/lib/utils";

export interface WilayahValue {
  provinsi_code: string | null;
  provinsi_nama: string | null;

  kota_code: string | null;
  kota_nama: string | null;

  kecamatan_code: string | null;
  kecamatan_nama: string | null;

  kelurahan_code: string | null;
  kelurahan_nama: string | null;
}

interface Item {
  code: string;
  name: string;
}

const API =
  "https://www.emsifa.com/api-wilayah-indonesia/api";

async function fetchList(url: string): Promise<Item[]> {
  try {
    const res = await fetch(url);

    if (!res.ok) {
      console.error("fetch gagal", res.status);
      return [];
    }

    const json = await res.json();

    return json.map((x: any) => ({
      code: x.id,
      name: x.name,
    }));
  } catch (err) {
    console.error("fetch error:", err);
    return [];
  }
}

function ComboBox({
  value,
  label,
  items,
  loading,
  disabled,
  onChange,
}: {
  value: string | null;
  label: string;
  items: Item[];
  loading?: boolean;
  disabled?: boolean;
  onChange: (item: Item | null) => void;
}) {
  const [open, setOpen] = useState(false);

  const current = items.find((i) => i.code === value);

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium">
        {label}
      </label>

      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            disabled={disabled}
            className={cn(
              "w-full justify-between",
              !current && "text-muted-foreground"
            )}
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              current?.name ??
              `Pilih ${label.toLowerCase()}`
            )}

            <ChevronsUpDown className="ml-2 h-4 w-4 opacity-50" />
          </Button>
        </PopoverTrigger>

        <PopoverContent
          className="w-[--radix-popover-trigger-width] p-0"
          align="start"
        >
          <div className="max-h-64 overflow-y-auto">
            {items.length === 0 ? (
              <div className="p-3 text-sm text-muted-foreground">
                Tidak ditemukan
              </div>
            ) : (
              items.map((it) => (
                <button
                  key={it.code}
                  type="button"
                  onClick={() => {
                    onChange(it);
                    setOpen(false);
                  }}
                  className="flex w-full items-center px-3 py-2 text-sm hover:bg-muted"
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      current?.code === it.code
                        ? "opacity-100"
                        : "opacity-0"
                    )}
                  />

                  {it.name}
                </button>
              ))
            )}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}

export function AddressPicker({
  value,
  onChange,
}: {
  value: WilayahValue;
  onChange: (v: WilayahValue) => void;
}) {
  const [provinces, setProvinces] = useState<Item[]>([]);
  const [regencies, setRegencies] = useState<Item[]>([]);
  const [districts, setDistricts] = useState<Item[]>([]);
  const [villages, setVillages] = useState<Item[]>([]);

  const [loading, setLoading] = useState({
    p: false,
    r: false,
    d: false,
    v: false,
  });

  // provinces
  useEffect(() => {
    setLoading((s) => ({ ...s, p: true }));

    fetchList(`${API}/provinces.json`)
      .then(setProvinces)
      .finally(() => {
        setLoading((s) => ({ ...s, p: false }));
      });
  }, []);

  // regencies
  useEffect(() => {
    if (!value.provinsi_code) {
      setRegencies([]);
      return;
    }

    setLoading((s) => ({ ...s, r: true }));

    fetchList(
      `${API}/regencies/${value.provinsi_code}.json`
    )
      .then(setRegencies)
      .finally(() => {
        setLoading((s) => ({ ...s, r: false }));
      });
  }, [value.provinsi_code]);

  // districts
  useEffect(() => {
    if (!value.kota_code) {
      setDistricts([]);
      return;
    }

    setLoading((s) => ({ ...s, d: true }));

    fetchList(
      `${API}/districts/${value.kota_code}.json`
    )
      .then(setDistricts)
      .finally(() => {
        setLoading((s) => ({ ...s, d: false }));
      });
  }, [value.kota_code]);

  // villages
  useEffect(() => {
    if (!value.kecamatan_code) {
      setVillages([]);
      return;
    }

    setLoading((s) => ({ ...s, v: true }));

    fetchList(
      `${API}/villages/${value.kecamatan_code}.json`
    )
      .then(setVillages)
      .finally(() => {
        setLoading((s) => ({ ...s, v: false }));
      });
  }, [value.kecamatan_code]);

  return (
    <div className="grid gap-4">
      <ComboBox
        label="Provinsi"
        value={value.provinsi_code}
        items={provinces}
        loading={loading.p}
        onChange={(it) =>
          onChange({
            ...value,

            provinsi_code: it?.code ?? null,
            provinsi_nama: it?.name ?? null,

            kota_code: null,
            kota_nama: null,

            kecamatan_code: null,
            kecamatan_nama: null,

            kelurahan_code: null,
            kelurahan_nama: null,
          })
        }
      />

      <ComboBox
        label="Kota / Kabupaten"
        value={value.kota_code}
        items={regencies}
        loading={loading.r}
        disabled={!value.provinsi_code}
        onChange={(it) =>
          onChange({
            ...value,

            kota_code: it?.code ?? null,
            kota_nama: it?.name ?? null,

            kecamatan_code: null,
            kecamatan_nama: null,

            kelurahan_code: null,
            kelurahan_nama: null,
          })
        }
      />

      <ComboBox
        label="Kecamatan"
        value={value.kecamatan_code}
        items={districts}
        loading={loading.d}
        disabled={!value.kota_code}
        onChange={(it) =>
          onChange({
            ...value,

            kecamatan_code: it?.code ?? null,
            kecamatan_nama: it?.name ?? null,

            kelurahan_code: null,
            kelurahan_nama: null,
          })
        }
      />

      <ComboBox
        label="Kelurahan / Desa"
        value={value.kelurahan_code}
        items={villages}
        loading={loading.v}
        disabled={!value.kecamatan_code}
        onChange={(it) =>
          onChange({
            ...value,

            kelurahan_code: it?.code ?? null,
            kelurahan_nama: it?.name ?? null,
          })
        }
      />
    </div>
  );
}

export function emptyWilayah(): WilayahValue {
  return {
    provinsi_code: null,
    provinsi_nama: null,

    kota_code: null,
    kota_nama: null,

    kecamatan_code: null,
    kecamatan_nama: null,

    kelurahan_code: null,
    kelurahan_nama: null,
  };
}
