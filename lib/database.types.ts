export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      early_access_emails: {
        Row: {
          created_at: string | null
          email: string
          id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          email: string
          id?: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string
          id?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      exam_images: {
        Row: {
          created_at: string | null
          exam_id: string
          file_name: string | null
          file_size: number | null
          id: string
          image_type: string | null
          image_url: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          exam_id: string
          file_name?: string | null
          file_size?: number | null
          id?: string
          image_type?: string | null
          image_url: string
          user_id?: string
        }
        Update: {
          created_at?: string | null
          exam_id?: string
          file_name?: string | null
          file_size?: number | null
          id?: string
          image_type?: string | null
          image_url?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "exam_images_exam_id_fkey"
            columns: ["exam_id"]
            isOneToOne: false
            referencedRelation: "exams"
            referencedColumns: ["id"]
          },
        ]
      }
      exams: {
        Row: {
          created_at: string | null
          exam_date: string
          exam_name: string
          exam_type: string
          id: string
          total_net_score: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          exam_date: string
          exam_name: string
          exam_type: string
          id?: string
          total_net_score?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Update: {
          created_at?: string | null
          exam_date?: string
          exam_name?: string
          exam_type?: string
          id?: string
          total_net_score?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      question_analyses: {
        Row: {
          created_at: string | null
          date: string
          difficulty_level: string | null
          error_type: string | null
          exam_id: string
          id: string
          image_id: string | null
          learning_level: string | null
          new_generation_question: boolean | null
          question: string
          question_format: string | null
          question_status: string | null
          question_type: string | null
          related_topics: string[] | null
          selectivity: string | null
          solution_steps_count: number | null
          solution_strategy: string | null
          solution_time: number | null
          source: string | null
          sub_achievement: string | null
          subject: string
          topic: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          date: string
          difficulty_level?: string | null
          error_type?: string | null
          exam_id: string
          id?: string
          image_id?: string | null
          learning_level?: string | null
          new_generation_question?: boolean | null
          question: string
          question_format?: string | null
          question_status?: string | null
          question_type?: string | null
          related_topics?: string[] | null
          selectivity?: string | null
          solution_steps_count?: number | null
          solution_strategy?: string | null
          solution_time?: number | null
          source?: string | null
          sub_achievement?: string | null
          subject: string
          topic: string
          updated_at?: string | null
          user_id?: string
        }
        Update: {
          created_at?: string | null
          date?: string
          difficulty_level?: string | null
          error_type?: string | null
          exam_id?: string
          id?: string
          image_id?: string | null
          learning_level?: string | null
          new_generation_question?: boolean | null
          question?: string
          question_format?: string | null
          question_status?: string | null
          question_type?: string | null
          related_topics?: string[] | null
          selectivity?: string | null
          solution_steps_count?: number | null
          solution_strategy?: string | null
          solution_time?: number | null
          source?: string | null
          sub_achievement?: string | null
          subject?: string
          topic?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "question_analyses_exam_id_fkey"
            columns: ["exam_id"]
            isOneToOne: false
            referencedRelation: "exams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "question_analyses_image_id_fkey"
            columns: ["image_id"]
            isOneToOne: false
            referencedRelation: "exam_images"
            referencedColumns: ["id"]
          },
        ]
      }
      subjects: {
        Row: {
          blank_answers: number | null
          correct_answers: number | null
          created_at: string | null
          exam_id: string
          id: string
          net_score: number | null
          subject_name: string
          updated_at: string | null
          user_id: string
          wrong_answers: number | null
        }
        Insert: {
          blank_answers?: number | null
          correct_answers?: number | null
          created_at?: string | null
          exam_id: string
          id?: string
          net_score?: number | null
          subject_name: string
          updated_at?: string | null
          user_id?: string
          wrong_answers?: number | null
        }
        Update: {
          blank_answers?: number | null
          correct_answers?: number | null
          created_at?: string | null
          exam_id?: string
          id?: string
          net_score?: number | null
          subject_name?: string
          updated_at?: string | null
          user_id?: string
          wrong_answers?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "subjects_exam_id_fkey"
            columns: ["exam_id"]
            isOneToOne: false
            referencedRelation: "exams"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          created_at: string | null
          email: string | null
          id: string
          is_active: boolean | null
          name: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          email?: string | null
          id?: string
          is_active?: boolean | null
          name?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          email?: string | null
          id?: string
          is_active?: boolean | null
          name?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      insert_early_access_email: {
        Args: { email_param: string }
        Returns: boolean
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

type DefaultSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const 