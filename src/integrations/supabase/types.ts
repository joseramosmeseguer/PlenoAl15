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
      bonus_predictions: {
        Row: {
          answer: Json
          bonus_id: string
          created_at: string
          points_awarded: number
          updated_at: string
          user_id: string
        }
        Insert: {
          answer: Json
          bonus_id: string
          created_at?: string
          points_awarded?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          answer?: Json
          bonus_id?: string
          created_at?: string
          points_awarded?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bonus_predictions_bonus_id_fkey"
            columns: ["bonus_id"]
            isOneToOne: false
            referencedRelation: "bonus_questions"
            referencedColumns: ["id"]
          },
        ]
      }
      bonus_questions: {
        Row: {
          category: string
          correct_answer: Json | null
          created_at: string
          deadline_at: string
          description: string | null
          id: string
          is_active: boolean
          is_fun: boolean
          is_visible: boolean
          key: string
          kind: string
          label: string
          location: string
          location_label: string | null
          multi_text_count: number
          points: number
          position: number
          start_at: string | null
          updated_at: string
        }
        Insert: {
          category?: string
          correct_answer?: Json | null
          created_at?: string
          deadline_at: string
          description?: string | null
          id?: string
          is_active?: boolean
          is_fun?: boolean
          is_visible?: boolean
          key: string
          kind?: string
          label: string
          location?: string
          location_label?: string | null
          multi_text_count?: number
          points?: number
          position?: number
          start_at?: string | null
          updated_at?: string
        }
        Update: {
          category?: string
          correct_answer?: Json | null
          created_at?: string
          deadline_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          is_fun?: boolean
          is_visible?: boolean
          key?: string
          kind?: string
          label?: string
          location?: string
          location_label?: string | null
          multi_text_count?: number
          points?: number
          position?: number
          start_at?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      daily_snapshots: {
        Row: {
          position: number
          snapshot_date: string
          total_points: number
          user_id: string
        }
        Insert: {
          position?: number
          snapshot_date: string
          total_points?: number
          user_id: string
        }
        Update: {
          position?: number
          snapshot_date?: string
          total_points?: number
          user_id?: string
        }
        Relationships: []
      }
      juego_picks: {
        Row: {
          user_id: string
          stage: string
          bracket_position: number
          team_code: string
          created_at: string
          updated_at: string
        }
        Insert: {
          user_id: string
          stage: string
          bracket_position: number
          team_code: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          user_id?: string
          stage?: string
          bracket_position?: number
          team_code?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      matches: {
        Row: {
          away_code: string | null
          away_label: string | null
          away_score: number | null
          bracket_position: number | null
          created_at: string
          external_id: string | null
          group_letter: string | null
          home_code: string | null
          home_label: string | null
          home_score: number | null
          id: string
          is_premium: boolean
          is_megapremium: boolean
          kickoff_at: string
          predictions_locked: boolean
          stage: Database["public"]["Enums"]["match_stage"]
          status: string
          updated_at: string
        }
        Insert: {
          away_code?: string | null
          away_label?: string | null
          away_score?: number | null
          bracket_position?: number | null
          created_at?: string
          external_id?: string | null
          group_letter?: string | null
          home_code?: string | null
          home_label?: string | null
          home_score?: number | null
          id?: string
          is_premium?: boolean
          is_megapremium?: boolean
          kickoff_at: string
          predictions_locked?: boolean
          stage?: Database["public"]["Enums"]["match_stage"]
          status?: string
          updated_at?: string
        }
        Update: {
          away_code?: string | null
          away_label?: string | null
          away_score?: number | null
          bracket_position?: number | null
          created_at?: string
          external_id?: string | null
          group_letter?: string | null
          home_code?: string | null
          home_label?: string | null
          home_score?: number | null
          id?: string
          is_premium?: boolean
          is_megapremium?: boolean
          kickoff_at?: string
          predictions_locked?: boolean
          stage?: Database["public"]["Enums"]["match_stage"]
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "matches_away_code_fkey"
            columns: ["away_code"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "matches_home_code_fkey"
            columns: ["home_code"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["code"]
          },
        ]
      }
      predictions: {
        Row: {
          away_score: number
          created_at: string
          home_score: number
          match_id: string
          points_awarded: number
          updated_at: string
          user_id: string
        }
        Insert: {
          away_score: number
          created_at?: string
          home_score: number
          match_id: string
          points_awarded?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          away_score?: number
          created_at?: string
          home_score?: number
          match_id?: string
          points_awarded?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "predictions_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "matches"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_emoji: string | null
          created_at: string
          display_name: string
          email: string | null
          id: string
          is_hidden: boolean
          updated_at: string
        }
        Insert: {
          avatar_emoji?: string | null
          created_at?: string
          display_name: string
          email?: string | null
          id: string
          is_hidden?: boolean
          updated_at?: string
        }
        Update: {
          avatar_emoji?: string | null
          created_at?: string
          display_name?: string
          email?: string | null
          id?: string
          is_hidden?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      settings: {
        Row: {
          key: string
          updated_at: string
          value: Json
        }
        Insert: {
          key: string
          updated_at?: string
          value: Json
        }
        Update: {
          key?: string
          updated_at?: string
          value?: Json
        }
        Relationships: []
      }
      teams: {
        Row: {
          code: string
          flag: string
          group_letter: string | null
          name: string
        }
        Insert: {
          code: string
          flag: string
          group_letter?: string | null
          name: string
        }
        Update: {
          code?: string
          flag?: string
          group_letter?: string | null
          name?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      v_leaderboard: {
        Row: {
          avatar_emoji: string | null
          bonus_points: number | null
          display_name: string | null
          exact_count: number | null
          match_points: number | null
          outcome_count: number | null
          total_points: number | null
          user_id: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      outcome: { Args: { a: number; h: number }; Returns: string }
      recompute_all_points: { Args: never; Returns: undefined }
      recompute_bonus_points: {
        Args: { _bonus_id: string }
        Returns: undefined
      }
      recompute_match_points: {
        Args: { _match_id: string }
        Returns: undefined
      }
      unaccent: { Args: { "": string }; Returns: string }
    }
    Enums: {
      app_role: "admin" | "user"
      match_stage:
        | "group"
        | "round_of_32"
        | "round_of_16"
        | "quarter_final"
        | "semi_final"
        | "third_place"
        | "final"
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
      app_role: ["admin", "user"],
      match_stage: [
        "group",
        "round_of_32",
        "round_of_16",
        "quarter_final",
        "semi_final",
        "third_place",
        "final",
      ],
    },
  },
} as const
