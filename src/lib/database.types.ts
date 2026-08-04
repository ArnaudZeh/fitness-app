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
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
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
      ai_provider_keys: {
        Row: {
          created_at: string
          id: string
          is_valid: boolean
          last_validated_at: string | null
          provider: string
          updated_at: string
          user_id: string
          vault_secret_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_valid?: boolean
          last_validated_at?: string | null
          provider: string
          updated_at?: string
          user_id: string
          vault_secret_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_valid?: boolean
          last_validated_at?: string | null
          provider?: string
          updated_at?: string
          user_id?: string
          vault_secret_id?: string
        }
        Relationships: []
      }
      assistant_messages: {
        Row: {
          applied_at: string | null
          content: string
          created_at: string
          id: string
          role: string
          tool_name: string | null
          tool_proposal: Json | null
          user_id: string
        }
        Insert: {
          applied_at?: string | null
          content: string
          created_at?: string
          id?: string
          role: string
          tool_name?: string | null
          tool_proposal?: Json | null
          user_id: string
        }
        Update: {
          applied_at?: string | null
          content?: string
          created_at?: string
          id?: string
          role?: string
          tool_name?: string | null
          tool_proposal?: Json | null
          user_id?: string
        }
        Relationships: []
      }
      breath_protocols: {
        Row: {
          created_at: string
          cycles: number
          hold_seconds: number
          id: string
          name: string
          recovery_seconds: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          cycles: number
          hold_seconds: number
          id?: string
          name: string
          recovery_seconds: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          cycles?: number
          hold_seconds?: number
          id?: string
          name?: string
          recovery_seconds?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      breath_session_logs: {
        Row: {
          completed_at: string
          completed_cycles: number
          created_at: string
          id: string
          protocol_id: string
          started_at: string
          user_id: string
        }
        Insert: {
          completed_at?: string
          completed_cycles: number
          created_at?: string
          id?: string
          protocol_id: string
          started_at: string
          user_id: string
        }
        Update: {
          completed_at?: string
          completed_cycles?: number
          created_at?: string
          id?: string
          protocol_id?: string
          started_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "breath_session_logs_protocol_id_fkey"
            columns: ["protocol_id"]
            isOneToOne: false
            referencedRelation: "breath_protocols"
            referencedColumns: ["id"]
          },
        ]
      }
      cycle_entries: {
        Row: {
          created_at: string
          id: string
          start_date: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          start_date: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          start_date?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      exercises: {
        Row: {
          created_at: string
          id: string
          image_url: string | null
          muscle_group: string | null
          name: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          image_url?: string | null
          muscle_group?: string | null
          name: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          image_url?: string | null
          muscle_group?: string | null
          name?: string
          user_id?: string | null
        }
        Relationships: []
      }
      feed_activity_notifications: {
        Row: {
          actor_id: string
          content_id: string
          content_type: string
          created_at: string
          id: string
          read_at: string | null
          recipient_id: string
          type: string
        }
        Insert: {
          actor_id: string
          content_id: string
          content_type: string
          created_at?: string
          id?: string
          read_at?: string | null
          recipient_id: string
          type: string
        }
        Update: {
          actor_id?: string
          content_id?: string
          content_type?: string
          created_at?: string
          id?: string
          read_at?: string | null
          recipient_id?: string
          type?: string
        }
        Relationships: []
      }
      feed_comments: {
        Row: {
          content: string
          created_at: string
          id: string
          target_id: string
          target_type: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          target_id: string
          target_type: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          target_id?: string
          target_type?: string
          user_id?: string
        }
        Relationships: []
      }
      feed_likes: {
        Row: {
          created_at: string
          id: string
          target_id: string
          target_type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          target_id: string
          target_type: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          target_id?: string
          target_type?: string
          user_id?: string
        }
        Relationships: []
      }
      feed_mentions: {
        Row: {
          author_id: string
          content_id: string
          content_type: string
          created_at: string
          id: string
          mentioned_user_id: string
          read_at: string | null
        }
        Insert: {
          author_id: string
          content_id: string
          content_type: string
          created_at?: string
          id?: string
          mentioned_user_id: string
          read_at?: string | null
        }
        Update: {
          author_id?: string
          content_id?: string
          content_type?: string
          created_at?: string
          id?: string
          mentioned_user_id?: string
          read_at?: string | null
        }
        Relationships: []
      }
      friendships: {
        Row: {
          addressee_id: string
          created_at: string
          id: string
          requester_id: string
          status: string
          user_a: string | null
          user_b: string | null
        }
        Insert: {
          addressee_id: string
          created_at?: string
          id?: string
          requester_id: string
          status?: string
          user_a?: string | null
          user_b?: string | null
        }
        Update: {
          addressee_id?: string
          created_at?: string
          id?: string
          requester_id?: string
          status?: string
          user_a?: string | null
          user_b?: string | null
        }
        Relationships: []
      }
      milestones: {
        Row: {
          achieved_at: string
          created_at: string
          exercise_id: string | null
          exercise_name: string | null
          id: string
          milestone_type: string
          user_id: string
          value: number
        }
        Insert: {
          achieved_at?: string
          created_at?: string
          exercise_id?: string | null
          exercise_name?: string | null
          id?: string
          milestone_type: string
          user_id: string
          value: number
        }
        Update: {
          achieved_at?: string
          created_at?: string
          exercise_id?: string | null
          exercise_name?: string | null
          id?: string
          milestone_type?: string
          user_id?: string
          value?: number
        }
        Relationships: [
          {
            foreignKeyName: "milestones_exercise_id_fkey"
            columns: ["exercise_id"]
            isOneToOne: false
            referencedRelation: "exercises"
            referencedColumns: ["id"]
          },
        ]
      }
      posts: {
        Row: {
          content: string | null
          created_at: string
          id: string
          storage_path: string | null
          user_id: string
        }
        Insert: {
          content?: string | null
          created_at?: string
          id?: string
          storage_path?: string | null
          user_id: string
        }
        Update: {
          content?: string | null
          created_at?: string
          id?: string
          storage_path?: string | null
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_path: string | null
          created_at: string
          cycle_module_enabled: boolean
          date_of_birth: string | null
          display_name: string | null
          goal: string | null
          height_cm: number | null
          id: string
          is_public: boolean
          sex: string | null
          target_weight_kg: number | null
          timezone: string | null
          updated_at: string
        }
        Insert: {
          avatar_path?: string | null
          created_at?: string
          cycle_module_enabled?: boolean
          date_of_birth?: string | null
          display_name?: string | null
          goal?: string | null
          height_cm?: number | null
          id: string
          is_public?: boolean
          sex?: string | null
          target_weight_kg?: number | null
          timezone?: string | null
          updated_at?: string
        }
        Update: {
          avatar_path?: string | null
          created_at?: string
          cycle_module_enabled?: boolean
          date_of_birth?: string | null
          display_name?: string | null
          goal?: string | null
          height_cm?: number | null
          id?: string
          is_public?: boolean
          sex?: string | null
          target_weight_kg?: number | null
          timezone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      programs: {
        Row: {
          created_at: string
          description: string | null
          focus: string
          id: string
          name: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          focus?: string
          id?: string
          name: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          focus?: string
          id?: string
          name?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      push_subscriptions: {
        Row: {
          auth: string
          created_at: string
          endpoint: string
          id: string
          p256dh: string
          user_id: string
        }
        Insert: {
          auth: string
          created_at?: string
          endpoint: string
          id?: string
          p256dh: string
          user_id: string
        }
        Update: {
          auth?: string
          created_at?: string
          endpoint?: string
          id?: string
          p256dh?: string
          user_id?: string
        }
        Relationships: []
      }
      rest_timer_notifications: {
        Row: {
          created_at: string
          fire_at: string
          id: string
          sent: boolean
          session_log_set_id: string
          stage: string
          user_id: string
        }
        Insert: {
          created_at?: string
          fire_at: string
          id?: string
          sent?: boolean
          session_log_set_id: string
          stage?: string
          user_id: string
        }
        Update: {
          created_at?: string
          fire_at?: string
          id?: string
          sent?: boolean
          session_log_set_id?: string
          stage?: string
          user_id?: string
        }
        Relationships: []
      }
      session_log_sets: {
        Row: {
          actual_reps: number
          actual_rpe: number | null
          actual_weight_kg: number
          created_at: string
          exercise_id: string | null
          id: string
          session_log_id: string
          session_template_exercise_id: string
          set_number: number
          updated_at: string
          user_id: string
        }
        Insert: {
          actual_reps: number
          actual_rpe?: number | null
          actual_weight_kg: number
          created_at?: string
          exercise_id?: string | null
          id?: string
          session_log_id: string
          session_template_exercise_id: string
          set_number: number
          updated_at?: string
          user_id: string
        }
        Update: {
          actual_reps?: number
          actual_rpe?: number | null
          actual_weight_kg?: number
          created_at?: string
          exercise_id?: string | null
          id?: string
          session_log_id?: string
          session_template_exercise_id?: string
          set_number?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "session_log_sets_exercise_id_fkey"
            columns: ["exercise_id"]
            isOneToOne: false
            referencedRelation: "exercises"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "session_log_sets_session_log_id_fkey"
            columns: ["session_log_id"]
            isOneToOne: false
            referencedRelation: "session_logs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "session_log_sets_session_template_exercise_id_fkey"
            columns: ["session_template_exercise_id"]
            isOneToOne: false
            referencedRelation: "session_template_exercises"
            referencedColumns: ["id"]
          },
        ]
      }
      session_logs: {
        Row: {
          completed_at: string | null
          created_at: string
          id: string
          program_id: string
          session_template_id: string
          started_at: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          id?: string
          program_id: string
          session_template_id: string
          started_at?: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          id?: string
          program_id?: string
          session_template_id?: string
          started_at?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "session_logs_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "programs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "session_logs_session_template_id_fkey"
            columns: ["session_template_id"]
            isOneToOne: false
            referencedRelation: "session_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      session_template_exercises: {
        Row: {
          archived_at: string | null
          created_at: string
          exercise_id: string
          id: string
          is_bodyweight: boolean
          is_unilateral: boolean
          notes: string | null
          order_index: number
          session_template_id: string
          superset_group: string | null
          target_reps_max: number
          target_reps_min: number
          target_rest_seconds: number | null
          target_rpe: number | null
          target_sets: number
          target_weight_kg: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          archived_at?: string | null
          created_at?: string
          exercise_id: string
          id?: string
          is_bodyweight?: boolean
          is_unilateral?: boolean
          notes?: string | null
          order_index: number
          session_template_id: string
          superset_group?: string | null
          target_reps_max: number
          target_reps_min: number
          target_rest_seconds?: number | null
          target_rpe?: number | null
          target_sets: number
          target_weight_kg?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          archived_at?: string | null
          created_at?: string
          exercise_id?: string
          id?: string
          is_bodyweight?: boolean
          is_unilateral?: boolean
          notes?: string | null
          order_index?: number
          session_template_id?: string
          superset_group?: string | null
          target_reps_max?: number
          target_reps_min?: number
          target_rest_seconds?: number | null
          target_rpe?: number | null
          target_sets?: number
          target_weight_kg?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "session_template_exercises_exercise_id_fkey"
            columns: ["exercise_id"]
            isOneToOne: false
            referencedRelation: "exercises"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "session_template_exercises_session_template_id_fkey"
            columns: ["session_template_id"]
            isOneToOne: false
            referencedRelation: "session_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      session_templates: {
        Row: {
          created_at: string
          day_of_week: number
          day_type: string
          id: string
          program_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          day_of_week: number
          day_type?: string
          id?: string
          program_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          day_of_week?: number
          day_type?: string
          id?: string
          program_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "session_templates_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "programs"
            referencedColumns: ["id"]
          },
        ]
      }
      weight_entries: {
        Row: {
          created_at: string
          id: string
          recorded_at: string
          updated_at: string
          user_id: string
          weight_kg: number
        }
        Insert: {
          created_at?: string
          id?: string
          recorded_at?: string
          updated_at?: string
          user_id: string
          weight_kg: number
        }
        Update: {
          created_at?: string
          id?: string
          recorded_at?: string
          updated_at?: string
          user_id?: string
          weight_kg?: number
        }
        Relationships: []
      }
      wellness_activities: {
        Row: {
          active: boolean
          created_at: string
          days_of_week: number[]
          id: string
          name: string
          reminder_time: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          days_of_week?: number[]
          id?: string
          name: string
          reminder_time?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          active?: boolean
          created_at?: string
          days_of_week?: number[]
          id?: string
          name?: string
          reminder_time?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      wellness_activity_logs: {
        Row: {
          activity_id: string
          completed_date: string
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          activity_id: string
          completed_date?: string
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          activity_id?: string
          completed_date?: string
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "wellness_activity_logs_activity_id_fkey"
            columns: ["activity_id"]
            isOneToOne: false
            referencedRelation: "wellness_activities"
            referencedColumns: ["id"]
          },
        ]
      }
      wellness_reminder_sends: {
        Row: {
          activity_id: string
          created_at: string
          id: string
          sent_date: string
        }
        Insert: {
          activity_id: string
          created_at?: string
          id?: string
          sent_date: string
        }
        Update: {
          activity_id?: string
          created_at?: string
          id?: string
          sent_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "wellness_reminder_sends_activity_id_fkey"
            columns: ["activity_id"]
            isOneToOne: false
            referencedRelation: "wellness_activities"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      friend_profile_details: {
        Row: {
          age: number | null
          avatar_path: string | null
          display_name: string | null
          goal: string | null
          id: string | null
          is_public: boolean | null
        }
        Insert: {
          age?: never
          avatar_path?: string | null
          display_name?: string | null
          goal?: string | null
          id?: string | null
          is_public?: boolean | null
        }
        Update: {
          age?: never
          avatar_path?: string | null
          display_name?: string | null
          goal?: string | null
          id?: string | null
          is_public?: boolean | null
        }
        Relationships: []
      }
      public_profiles: {
        Row: {
          display_name: string | null
          id: string | null
        }
        Insert: {
          display_name?: string | null
          id?: string | null
        }
        Update: {
          display_name?: string | null
          id?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      ai_vault_create_secret: {
        Args: { p_name: string; p_secret: string }
        Returns: string
      }
      ai_vault_delete_secret: { Args: { p_id: string }; Returns: undefined }
      ai_vault_read_secret: { Args: { p_id: string }; Returns: string }
      ai_vault_update_secret: {
        Args: { p_id: string; p_secret: string }
        Returns: undefined
      }
      are_friends: {
        Args: { p_user_1: string; p_user_2: string }
        Returns: boolean
      }
      can_view_feed_target: {
        Args: { p_target_id: string; p_target_type: string }
        Returns: boolean
      }
      can_view_mention: {
        Args: { p_content_id: string; p_content_type: string }
        Returns: boolean
      }
      can_view_program_details: {
        Args: { p_program_id: string }
        Returns: boolean
      }
      can_view_session_template: {
        Args: { p_session_template_id: string }
        Returns: boolean
      }
      feed_target_owner: {
        Args: { p_content_id: string; p_content_type: string }
        Returns: string
      }
      invoke_send_rest_timer_notifications: { Args: never; Returns: undefined }
      invoke_send_wellness_reminders: { Args: never; Returns: undefined }
      is_profile_public: { Args: { p_user_id: string }; Returns: boolean }
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
