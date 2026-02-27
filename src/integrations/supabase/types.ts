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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      appointments: {
        Row: {
          created_at: string
          date: string
          doctor_id: string | null
          id: string
          materials_used: Json | null
          notes: string
          patient_cedula: string | null
          patient_email: string | null
          patient_name: string
          patient_phone: string
          price_usd: number
          status: string
          time: string
          treatment: string
        }
        Insert: {
          created_at?: string
          date: string
          doctor_id?: string | null
          id?: string
          materials_used?: Json | null
          notes?: string
          patient_cedula?: string | null
          patient_email?: string | null
          patient_name: string
          patient_phone: string
          price_usd?: number
          status?: string
          time: string
          treatment: string
        }
        Update: {
          created_at?: string
          date?: string
          doctor_id?: string | null
          id?: string
          materials_used?: Json | null
          notes?: string
          patient_cedula?: string | null
          patient_email?: string | null
          patient_name?: string
          patient_phone?: string
          price_usd?: number
          status?: string
          time?: string
          treatment?: string
        }
        Relationships: [
          {
            foreignKeyName: "appointments_doctor_id_fkey"
            columns: ["doctor_id"]
            isOneToOne: false
            referencedRelation: "doctors"
            referencedColumns: ["id"]
          },
        ]
      }
      doctors: {
        Row: {
          created_at: string
          email: string
          id: string
          name: string
          pay_model: string
          rate: number
          specialty: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          name: string
          pay_model?: string
          rate?: number
          specialty?: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          name?: string
          pay_model?: string
          rate?: number
          specialty?: string
        }
        Relationships: []
      }
      finances: {
        Row: {
          appointment_id: string | null
          created_at: string
          date: string
          doctor_pay_usd: number
          id: string
          materials_cost_usd: number
          tasa_bcv: number
          treatment_price_usd: number
          utility_usd: number
        }
        Insert: {
          appointment_id?: string | null
          created_at?: string
          date: string
          doctor_pay_usd?: number
          id?: string
          materials_cost_usd?: number
          tasa_bcv?: number
          treatment_price_usd?: number
          utility_usd?: number
        }
        Update: {
          appointment_id?: string | null
          created_at?: string
          date?: string
          doctor_pay_usd?: number
          id?: string
          materials_cost_usd?: number
          tasa_bcv?: number
          treatment_price_usd?: number
          utility_usd?: number
        }
        Relationships: [
          {
            foreignKeyName: "finances_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory: {
        Row: {
          created_at: string
          id: string
          min_stock: number
          name: string
          price_usd: number
          stock: number
        }
        Insert: {
          created_at?: string
          id?: string
          min_stock?: number
          name: string
          price_usd?: number
          stock?: number
        }
        Update: {
          created_at?: string
          id?: string
          min_stock?: number
          name?: string
          price_usd?: number
          stock?: number
        }
        Relationships: []
      }
      patients: {
        Row: {
          cedula: string
          clinical_history_url: string
          created_at: string
          email: string
          id: string
          name: string
          notes: string
          phone: string
          photos: string[]
        }
        Insert: {
          cedula: string
          clinical_history_url?: string
          created_at?: string
          email?: string
          id?: string
          name: string
          notes?: string
          phone: string
          photos?: string[]
        }
        Update: {
          cedula?: string
          clinical_history_url?: string
          created_at?: string
          email?: string
          id?: string
          name?: string
          notes?: string
          phone?: string
          photos?: string[]
        }
        Relationships: []
      }
      settings: {
        Row: {
          created_at: string
          id: string
          tasa_bcv: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          tasa_bcv?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          tasa_bcv?: number
          updated_at?: string
        }
        Relationships: []
      }
      tenant_blocked_slots: {
        Row: {
          all_day: boolean
          created_at: string
          date: string
          end_time: string | null
          id: string
          rental_mode: string | null
          rental_price: number | null
          requester_cedula: string | null
          requester_cov: string | null
          requester_email: string | null
          requester_first_name: string | null
          requester_last_name: string | null
          requester_phone: string | null
          start_time: string | null
          status: string
          tenant_id: string | null
        }
        Insert: {
          all_day?: boolean
          created_at?: string
          date: string
          end_time?: string | null
          id?: string
          rental_mode?: string | null
          rental_price?: number | null
          requester_cedula?: string | null
          requester_cov?: string | null
          requester_email?: string | null
          requester_first_name?: string | null
          requester_last_name?: string | null
          requester_phone?: string | null
          start_time?: string | null
          status?: string
          tenant_id?: string | null
        }
        Update: {
          all_day?: boolean
          created_at?: string
          date?: string
          end_time?: string | null
          id?: string
          rental_mode?: string | null
          rental_price?: number | null
          requester_cedula?: string | null
          requester_cov?: string | null
          requester_email?: string | null
          requester_first_name?: string | null
          requester_last_name?: string | null
          requester_phone?: string | null
          start_time?: string | null
          status?: string
          tenant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tenant_blocked_slots_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenants: {
        Row: {
          cedula: string
          cov: string
          created_at: string
          email: string
          first_name: string
          id: string
          last_name: string
          phone: string
          rental_mode: string
          rental_price: number
        }
        Insert: {
          cedula?: string
          cov?: string
          created_at?: string
          email?: string
          first_name: string
          id?: string
          last_name: string
          phone?: string
          rental_mode?: string
          rental_price?: number
        }
        Update: {
          cedula?: string
          cov?: string
          created_at?: string
          email?: string
          first_name?: string
          id?: string
          last_name?: string
          phone?: string
          rental_mode?: string
          rental_price?: number
        }
        Relationships: []
      }
      treatments: {
        Row: {
          created_at: string
          id: string
          name: string
          price_usd: number
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          price_usd?: number
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          price_usd?: number
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
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
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin"
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
      app_role: ["admin"],
    },
  },
} as const
