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
      answer_prompts: {
        Row: {
          closed_at: string | null
          created_at: string
          id: string
          session_id: string
          text: string
        }
        Insert: {
          closed_at?: string | null
          created_at?: string
          id?: string
          session_id: string
          text: string
        }
        Update: {
          closed_at?: string | null
          created_at?: string
          id?: string
          session_id?: string
          text?: string
        }
        Relationships: []
      }
      audience_devices: {
        Row: {
          created_at: string
          device_id: string
          last_seen: string
        }
        Insert: {
          created_at?: string
          device_id: string
          last_seen?: string
        }
        Update: {
          created_at?: string
          device_id?: string
          last_seen?: string
        }
        Relationships: []
      }
      orders: {
        Row: {
          device_id: string
          id: string
          ordered_at: string
          picked_up_at: string | null
          session_id: string
        }
        Insert: {
          device_id: string
          id?: string
          ordered_at?: string
          picked_up_at?: string | null
          session_id: string
        }
        Update: {
          device_id?: string
          id?: string
          ordered_at?: string
          picked_up_at?: string | null
          session_id?: string
        }
        Relationships: []
      }
      receipts: {
        Row: {
          device_id: string
          issued_at: string
          redeemed_at: string | null
          scoop_ids: string[]
          status: string
          token: string
        }
        Insert: {
          device_id: string
          issued_at?: string
          redeemed_at?: string | null
          scoop_ids: string[]
          status?: string
          token: string
        }
        Update: {
          device_id?: string
          issued_at?: string
          redeemed_at?: string | null
          scoop_ids?: string[]
          status?: string
          token?: string
        }
        Relationships: []
      }
      scoops: {
        Row: {
          device_id: string
          flavor: string
          id: string
          session_id: string
          stacked_at: string
        }
        Insert: {
          device_id: string
          flavor: string
          id?: string
          session_id: string
          stacked_at?: string
        }
        Update: {
          device_id?: string
          flavor?: string
          id?: string
          session_id?: string
          stacked_at?: string
        }
        Relationships: []
      }
      session_nonces: {
        Row: {
          kind: string
          nonce: string
          rotated_at: string
          session_id: string
        }
        Insert: {
          kind: string
          nonce: string
          rotated_at?: string
          session_id: string
        }
        Update: {
          kind?: string
          nonce?: string
          rotated_at?: string
          session_id?: string
        }
        Relationships: []
      }
      session_secrets: {
        Row: {
          password_hash: string
          session_id: string
          set_at: string
        }
        Insert: {
          password_hash: string
          session_id: string
          set_at?: string
        }
        Update: {
          password_hash?: string
          session_id?: string
          set_at?: string
        }
        Relationships: []
      }
      session_slots: {
        Row: {
          capacity: number | null
          day: number
          period: string
          room: string
          title: string
          updated_at: string
        }
        Insert: {
          capacity?: number | null
          day: number
          period: string
          room: string
          title?: string
          updated_at?: string
        }
        Update: {
          capacity?: number | null
          day?: number
          period?: string
          room?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      slide_state: {
        Row: {
          id: string
          paused: boolean
          slide_index: number
          slide_total: number
          updated_at: string
        }
        Insert: {
          id?: string
          paused?: boolean
          slide_index?: number
          slide_total?: number
          updated_at?: string
        }
        Update: {
          id?: string
          paused?: boolean
          slide_index?: number
          slide_total?: number
          updated_at?: string
        }
        Relationships: []
      }
      topping_gates: {
        Row: {
          active_prompt_id: string | null
          answers_open: boolean
          questions_open: boolean
          session_id: string
          updated_at: string
        }
        Insert: {
          active_prompt_id?: string | null
          answers_open?: boolean
          questions_open?: boolean
          session_id: string
          updated_at?: string
        }
        Update: {
          active_prompt_id?: string | null
          answers_open?: boolean
          questions_open?: boolean
          session_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      topping_likes: {
        Row: {
          created_at: string
          device_id: string
          session_id: string
          topping_id: string
        }
        Insert: {
          created_at?: string
          device_id: string
          session_id: string
          topping_id: string
        }
        Update: {
          created_at?: string
          device_id?: string
          session_id?: string
          topping_id?: string
        }
        Relationships: []
      }
      toppings: {
        Row: {
          addressed: boolean
          created_at: string
          device_id: string
          id: string
          kind: string
          likes: number
          pinned: boolean
          prompt_id: string | null
          session_id: string
          text: string
        }
        Insert: {
          addressed?: boolean
          created_at?: string
          device_id: string
          id?: string
          kind?: string
          likes?: number
          pinned?: boolean
          prompt_id?: string | null
          session_id: string
          text: string
        }
        Update: {
          addressed?: boolean
          created_at?: string
          device_id?: string
          id?: string
          kind?: string
          likes?: number
          pinned?: boolean
          prompt_id?: string | null
          session_id?: string
          text?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
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
  public: {
    Enums: {},
  },
} as const
