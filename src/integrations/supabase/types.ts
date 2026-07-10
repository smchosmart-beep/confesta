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
          role: Database["public"]["Enums"]["audience_role"] | null
        }
        Insert: {
          created_at?: string
          device_id: string
          last_seen?: string
          role?: Database["public"]["Enums"]["audience_role"] | null
        }
        Update: {
          created_at?: string
          device_id?: string
          last_seen?: string
          role?: Database["public"]["Enums"]["audience_role"] | null
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
      session_bookmarks: {
        Row: {
          created_at: string
          file_mime: string | null
          file_name: string | null
          file_path: string | null
          file_size: number | null
          id: string
          session_id: string
          sort_order: number
          title: string
          url: string | null
        }
        Insert: {
          created_at?: string
          file_mime?: string | null
          file_name?: string | null
          file_path?: string | null
          file_size?: number | null
          id?: string
          session_id: string
          sort_order?: number
          title: string
          url?: string | null
        }
        Update: {
          created_at?: string
          file_mime?: string | null
          file_name?: string | null
          file_path?: string | null
          file_size?: number | null
          id?: string
          session_id?: string
          sort_order?: number
          title?: string
          url?: string | null
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
          password_plain: string | null
          session_id: string
          set_at: string
        }
        Insert: {
          password_hash: string
          password_plain?: string | null
          session_id: string
          set_at?: string
        }
        Update: {
          password_hash?: string
          password_plain?: string | null
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
      topping_comments: {
        Row: {
          created_at: string
          device_id: string
          id: string
          op_id: string | null
          role: Database["public"]["Enums"]["audience_role"]
          session_id: string
          text: string
          topping_id: string
        }
        Insert: {
          created_at?: string
          device_id: string
          id?: string
          op_id?: string | null
          role: Database["public"]["Enums"]["audience_role"]
          session_id: string
          text: string
          topping_id: string
        }
        Update: {
          created_at?: string
          device_id?: string
          id?: string
          op_id?: string | null
          role?: Database["public"]["Enums"]["audience_role"]
          session_id?: string
          text?: string
          topping_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "topping_comments_topping_id_fkey"
            columns: ["topping_id"]
            isOneToOne: false
            referencedRelation: "toppings"
            referencedColumns: ["id"]
          },
        ]
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
          op_id: string | null
          pinned: boolean
          prompt_id: string | null
          role: Database["public"]["Enums"]["audience_role"] | null
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
          op_id?: string | null
          pinned?: boolean
          prompt_id?: string | null
          role?: Database["public"]["Enums"]["audience_role"] | null
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
          op_id?: string | null
          pinned?: boolean
          prompt_id?: string | null
          role?: Database["public"]["Enums"]["audience_role"] | null
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
      count_comments_by_session: {
        Args: { _session_id: string }
        Returns: {
          cnt: number
          topping_id: string
        }[]
      }
      list_all_toppings_admin: {
        Args: { _session_id: string }
        Returns: {
          addressed: boolean
          created_at: string
          device_id: string
          id: string
          kind: string
          likes: number
          op_id: string
          pinned: boolean
          prompt_id: string
          prompt_text: string
          role: Database["public"]["Enums"]["audience_role"]
          session_id: string
          text: string
        }[]
      }
      list_answer_texts_by_session: {
        Args: { _session_id: string }
        Returns: {
          created_at: string
          id: string
          prompt_id: string
          text: string
        }[]
      }
      list_toppings_for_presenter: {
        Args: { _device_id?: string; _session_id: string }
        Returns: {
          addressed: boolean
          created_at: string
          device_id: string
          id: string
          kind: string
          liked_by_me: boolean
          likes: number
          op_id: string
          pinned: boolean
          prompt_id: string
          prompt_text: string
          role: Database["public"]["Enums"]["audience_role"]
          session_id: string
          text: string
        }[]
      }
      list_toppings_with_my_like: {
        Args: { _device_id?: string; _session_id: string }
        Returns: {
          addressed: boolean
          created_at: string
          device_id: string
          id: string
          kind: string
          liked_by_me: boolean
          likes: number
          pinned: boolean
          prompt_id: string
          role: Database["public"]["Enums"]["audience_role"]
          session_id: string
          text: string
        }[]
      }
      list_toppings_with_my_like_v2: {
        Args: { _device_id?: string; _limit?: number; _session_id: string }
        Returns: {
          addressed: boolean
          created_at: string
          device_id: string
          id: string
          kind: string
          liked_by_me: boolean
          likes: number
          op_id: string
          pinned: boolean
          prompt_id: string
          prompt_text: string
          role: Database["public"]["Enums"]["audience_role"]
          session_id: string
          text: string
        }[]
      }
      set_topping_like: {
        Args: {
          _device_id: string
          _liked: boolean
          _op_id: string
          _topping_id: string
        }
        Returns: {
          liked: boolean
          likes: number
        }[]
      }
      toggle_topping_like:
        | {
            Args: { _device_id: string; _topping_id: string }
            Returns: {
              liked: boolean
              likes: number
            }[]
          }
        | {
            Args: { _device_id: string; _op_id: string; _topping_id: string }
            Returns: {
              liked: boolean
              likes: number
            }[]
          }
    }
    Enums: {
      audience_role: "teacher" | "specialist" | "parent" | "other"
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
      audience_role: ["teacher", "specialist", "parent", "other"],
    },
  },
} as const
