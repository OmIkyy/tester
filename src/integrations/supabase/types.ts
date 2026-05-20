export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      activity_logs: {
        Row: {
          action: string
          created_at: string
          details: string | null
          id: string
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          details?: string | null
          id?: string
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          details?: string | null
          id?: string
          user_id?: string | null
        }
        Relationships: []
      }
      customer_types: {
        Row: {
          aktif: boolean
          created_at: string
          id: string
          nama: string
          updated_at: string
          urutan: number
        }
        Insert: {
          aktif?: boolean
          created_at?: string
          id?: string
          nama: string
          updated_at?: string
          urutan?: number
        }
        Update: {
          aktif?: boolean
          created_at?: string
          id?: string
          nama?: string
          updated_at?: string
          urutan?: number
        }
        Relationships: []
      }
      customers: {
        Row: {
          alamat: string | null
          area: string | null
          created_at: string
          foto_ktp: string | null
          foto_rumah: string | null
          id: string
          jenis: string | null
          jenis_id: string | null
          kecamatan_code: string | null
          kecamatan_nama: string | null
          kelurahan_code: string | null
          kelurahan_nama: string | null
          kota_code: string | null
          kota_nama: string | null
          maps: string | null
          nama: string
          nik: string | null
          odp: string | null
          paket: string | null
          paket_id: string | null
          provinsi_code: string | null
          provinsi_nama: string | null
          sales_id: string | null
          status: Database["public"]["Enums"]["customer_status"]
          wa: string | null
        }
        Insert: {
          alamat?: string | null
          area?: string | null
          created_at?: string
          foto_ktp?: string | null
          foto_rumah?: string | null
          id?: string
          jenis?: string | null
          jenis_id?: string | null
          kecamatan_code?: string | null
          kecamatan_nama?: string | null
          kelurahan_code?: string | null
          kelurahan_nama?: string | null
          kota_code?: string | null
          kota_nama?: string | null
          maps?: string | null
          nama: string
          nik?: string | null
          odp?: string | null
          paket?: string | null
          paket_id?: string | null
          provinsi_code?: string | null
          provinsi_nama?: string | null
          sales_id?: string | null
          status?: Database["public"]["Enums"]["customer_status"]
          wa?: string | null
        }
        Update: {
          alamat?: string | null
          area?: string | null
          created_at?: string
          foto_ktp?: string | null
          foto_rumah?: string | null
          id?: string
          jenis?: string | null
          jenis_id?: string | null
          kecamatan_code?: string | null
          kecamatan_nama?: string | null
          kelurahan_code?: string | null
          kelurahan_nama?: string | null
          kota_code?: string | null
          kota_nama?: string | null
          maps?: string | null
          nama?: string
          nik?: string | null
          odp?: string | null
          paket?: string | null
          paket_id?: string | null
          provinsi_code?: string | null
          provinsi_nama?: string | null
          sales_id?: string | null
          status?: Database["public"]["Enums"]["customer_status"]
          wa?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "customers_jenis_id_fkey"
            columns: ["jenis_id"]
            isOneToOne: false
            referencedRelation: "customer_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customers_paket_id_fkey"
            columns: ["paket_id"]
            isOneToOne: false
            referencedRelation: "packages"
            referencedColumns: ["id"]
          },
        ]
      }
      installations: {
        Row: {
          created_at: string
          customer_id: string
          foto_onu: string | null
          id: string
          kabel: number | null
          onu: string | null
          redaman: number | null
          selesai_at: string
          teknisi_id: string | null
        }
        Insert: {
          created_at?: string
          customer_id: string
          foto_onu?: string | null
          id?: string
          kabel?: number | null
          onu?: string | null
          redaman?: number | null
          selesai_at?: string
          teknisi_id?: string | null
        }
        Update: {
          created_at?: string
          customer_id?: string
          foto_onu?: string | null
          id?: string
          kabel?: number | null
          onu?: string | null
          redaman?: number | null
          selesai_at?: string
          teknisi_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "installations_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      packages: {
        Row: {
          aktif: boolean
          created_at: string
          deskripsi: string | null
          harga: number
          icon: string | null
          id: string
          kecepatan_mbps: number | null
          kecepatan_text: string
          nama: string
          updated_at: string
          urutan: number
          warna: string | null
        }
        Insert: {
          aktif?: boolean
          created_at?: string
          deskripsi?: string | null
          harga?: number
          icon?: string | null
          id?: string
          kecepatan_mbps?: number | null
          kecepatan_text: string
          nama: string
          updated_at?: string
          urutan?: number
          warna?: string | null
        }
        Update: {
          aktif?: boolean
          created_at?: string
          deskripsi?: string | null
          harga?: number
          icon?: string | null
          id?: string
          kecepatan_mbps?: number | null
          kecepatan_text?: string
          nama?: string
          updated_at?: string
          urutan?: number
          warna?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          email: string
          id: string
          nama: string
          nama_belakang: string | null
          nama_depan: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          email?: string
          id: string
          nama?: string
          nama_belakang?: string | null
          nama_depan?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          nama?: string
          nama_belakang?: string | null
          nama_depan?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      site_settings: {
        Row: {
          created_at: string
          favicon_url: string | null
          footer_text: string
          id: number
          logo_url: string | null
          og_image_url: string | null
          primary_color: string
          site_description: string
          site_name: string
          site_title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          favicon_url?: string | null
          footer_text?: string
          id?: number
          logo_url?: string | null
          og_image_url?: string | null
          primary_color?: string
          site_description?: string
          site_name?: string
          site_title?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          favicon_url?: string | null
          footer_text?: string
          id?: number
          logo_url?: string | null
          og_image_url?: string | null
          primary_color?: string
          site_description?: string
          site_name?: string
          site_title?: string
          updated_at?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          access: Json
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          access?: Json
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          access?: Json
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      complete_installation: {
        Args: {
          _customer_id: string
          _foto_onu?: string
          _kabel: number
          _onu: string
          _redaman: number
        }
        Returns: string
      }
      get_user_role: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["app_role"]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "ADMIN" | "SALES" | "TEKNISI" | "VIEWER"
      customer_status: "Pending" | "Selesai"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["ADMIN", "SALES", "TEKNISI", "VIEWER"],
      customer_status: ["Pending", "Selesai"],
    },
  },
} as const
