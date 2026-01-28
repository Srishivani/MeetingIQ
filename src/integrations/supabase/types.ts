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
      conversations: {
        Row: {
          created_at: string
          device_key: string
          duration_ms: number
          id: string
          mime_type: string
          size_bytes: number
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          device_key: string
          duration_ms: number
          id?: string
          mime_type: string
          size_bytes: number
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          device_key?: string
          duration_ms?: number
          id?: string
          mime_type?: string
          size_bytes?: number
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      meeting_items: {
        Row: {
          content: string
          context: string | null
          conversation_id: string
          created_at: string
          device_key: string
          id: string
          is_ai_enhanced: boolean
          item_type: string
          owner: string | null
          timestamp_ms: number
          trigger_phrase: string | null
        }
        Insert: {
          content: string
          context?: string | null
          conversation_id: string
          created_at?: string
          device_key: string
          id?: string
          is_ai_enhanced?: boolean
          item_type: string
          owner?: string | null
          timestamp_ms?: number
          trigger_phrase?: string | null
        }
        Update: {
          content?: string
          context?: string | null
          conversation_id?: string
          created_at?: string
          device_key?: string
          id?: string
          is_ai_enhanced?: boolean
          item_type?: string
          owner?: string | null
          timestamp_ms?: number
          trigger_phrase?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "meeting_items_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      meeting_participants: {
        Row: {
          created_at: string
          device_key: string
          email: string | null
          id: string
          meeting_id: string
          name: string
          role: string
          status: string
        }
        Insert: {
          created_at?: string
          device_key: string
          email?: string | null
          id?: string
          meeting_id: string
          name: string
          role?: string
          status?: string
        }
        Update: {
          created_at?: string
          device_key?: string
          email?: string | null
          id?: string
          meeting_id?: string
          name?: string
          role?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "meeting_participants_meeting_id_fkey"
            columns: ["meeting_id"]
            isOneToOne: false
            referencedRelation: "meetings"
            referencedColumns: ["id"]
          },
        ]
      }
      meeting_types: {
        Row: {
          color: string
          created_at: string
          icon: string
          id: string
          name: string
        }
        Insert: {
          color?: string
          created_at?: string
          icon?: string
          id?: string
          name: string
        }
        Update: {
          color?: string
          created_at?: string
          icon?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
      meetings: {
        Row: {
          agenda: Json | null
          conversation_id: string | null
          created_at: string
          description: string | null
          device_key: string
          duration_minutes: number
          id: string
          location: string | null
          location_type: string
          meeting_type_id: string | null
          scheduled_at: string
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          agenda?: Json | null
          conversation_id?: string | null
          created_at?: string
          description?: string | null
          device_key: string
          duration_minutes?: number
          id?: string
          location?: string | null
          location_type?: string
          meeting_type_id?: string | null
          scheduled_at: string
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          agenda?: Json | null
          conversation_id?: string | null
          created_at?: string
          description?: string | null
          device_key?: string
          duration_minutes?: number
          id?: string
          location?: string | null
          location_type?: string
          meeting_type_id?: string | null
          scheduled_at?: string
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "meetings_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meetings_meeting_type_id_fkey"
            columns: ["meeting_type_id"]
            isOneToOne: false
            referencedRelation: "meeting_types"
            referencedColumns: ["id"]
          },
        ]
      }
      summaries: {
        Row: {
          action_items: string[] | null
          conversation_id: string
          created_at: string
          decisions: string[] | null
          id: string
          key_points: string[] | null
          notable_quotes: Json | null
          open_questions: string[] | null
        }
        Insert: {
          action_items?: string[] | null
          conversation_id: string
          created_at?: string
          decisions?: string[] | null
          id?: string
          key_points?: string[] | null
          notable_quotes?: Json | null
          open_questions?: string[] | null
        }
        Update: {
          action_items?: string[] | null
          conversation_id?: string
          created_at?: string
          decisions?: string[] | null
          id?: string
          key_points?: string[] | null
          notable_quotes?: Json | null
          open_questions?: string[] | null
        }
        Relationships: [
          {
            foreignKeyName: "summaries_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: true
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      transcript_chunks: {
        Row: {
          conversation_id: string
          created_at: string
          embedding: string | null
          end_ms: number
          id: string
          speaker: string | null
          start_ms: number
          text: string
        }
        Insert: {
          conversation_id: string
          created_at?: string
          embedding?: string | null
          end_ms: number
          id?: string
          speaker?: string | null
          start_ms: number
          text: string
        }
        Update: {
          conversation_id?: string
          created_at?: string
          embedding?: string | null
          end_ms?: number
          id?: string
          speaker?: string | null
          start_ms?: number
          text?: string
        }
        Relationships: [
          {
            foreignKeyName: "transcript_chunks_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
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
