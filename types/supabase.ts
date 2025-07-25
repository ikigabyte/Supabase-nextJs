export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instanciate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "12.2.3 (519615d)"
  }
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          operationName?: string
          query?: string
          variables?: Json
          extensions?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      completed: {
        Row: {
          due_date: string | null
          history: Json | null
          ihd_date: string | null
          ink: string | null
          lamination: string | null
          material: string | null
          name_id: string
          notes: string | null
          order_id: number
          orderType: number | null
          print_method: string | null
          production_status: string | null
          quantity: string
          rush: string
          shape: string | null
          shipping_method: string
        }
        Insert: {
          due_date?: string | null
          history?: Json | null
          ihd_date?: string | null
          ink?: string | null
          lamination?: string | null
          material?: string | null
          name_id: string
          notes?: string | null
          order_id?: number
          orderType?: number | null
          print_method?: string | null
          production_status?: string | null
          quantity?: string
          rush: string
          shape?: string | null
          shipping_method?: string
        }
        Update: {
          due_date?: string | null
          history?: Json | null
          ihd_date?: string | null
          ink?: string | null
          lamination?: string | null
          material?: string | null
          name_id?: string
          notes?: string | null
          order_id?: number
          orderType?: number | null
          print_method?: string | null
          production_status?: string | null
          quantity?: string
          rush?: string
          shape?: string | null
          shipping_method?: string
        }
        Relationships: []
      }
      history: {
        Row: {
          id: number
          inserted_at: string
          name_id: string | null
          production_change: string
          user_id: string
        }
        Insert: {
          id?: number
          inserted_at?: string
          name_id?: string | null
          production_change: string
          user_id: string
        }
        Update: {
          id?: number
          inserted_at?: string
          name_id?: string | null
          production_change?: string
          user_id?: string
        }
        Relationships: []
      }
      order_viewers: {
        Row: {
          last_updated: string
          name_id: string
          user_id: string
        }
        Insert: {
          last_updated?: string
          name_id: string
          user_id?: string
        }
        Update: {
          last_updated?: string
          name_id?: string
          user_id?: string
        }
        Relationships: []
      }
      orders: {
        Row: {
          color: string | null
          due_date: string
          history: Json | null
          ihd_date: string | null
          ink: string | null
          lamination: string | null
          material: string | null
          name_id: string
          notes: string | null
          order_id: number
          orderType: number
          print_method: string | null
          production_status: string | null
          quantity: string
          rush: boolean
          shape: string | null
          shipping_method: string
        }
        Insert: {
          color?: string | null
          due_date: string
          history?: Json | null
          ihd_date?: string | null
          ink?: string | null
          lamination?: string | null
          material?: string | null
          name_id: string
          notes?: string | null
          order_id?: number
          orderType?: number
          print_method?: string | null
          production_status?: string | null
          quantity?: string
          rush?: boolean
          shape?: string | null
          shipping_method?: string
        }
        Update: {
          color?: string | null
          due_date?: string
          history?: Json | null
          ihd_date?: string | null
          ink?: string | null
          lamination?: string | null
          material?: string | null
          name_id?: string
          notes?: string | null
          order_id?: number
          orderType?: number
          print_method?: string | null
          production_status?: string | null
          quantity?: string
          rush?: boolean
          shape?: string | null
          shipping_method?: string
        }
        Relationships: []
      }
      timeline: {
        Row: {
          ihd_date: string | null
          order_id: number
          production_status: string | null
          ship_date: string | null
          shipping_method: string | null
        }
        Insert: {
          ihd_date?: string | null
          order_id: number
          production_status?: string | null
          ship_date?: string | null
          shipping_method?: string | null
        }
        Update: {
          ihd_date?: string | null
          order_id?: number
          production_status?: string | null
          ship_date?: string | null
          shipping_method?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      move_order: {
        Args: { p_id: string }
        Returns: undefined
      }
      scheduler_deleter: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
    }
    Enums: {
      [_ in never]: never
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const
