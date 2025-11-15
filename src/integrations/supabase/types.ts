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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      ai_response_cache: {
        Row: {
          created_at: string
          hit_count: number | null
          id: string
          last_used_at: string
          question: string
          question_hash: string
          response: string
        }
        Insert: {
          created_at?: string
          hit_count?: number | null
          id?: string
          last_used_at?: string
          question: string
          question_hash: string
          response: string
        }
        Update: {
          created_at?: string
          hit_count?: number | null
          id?: string
          last_used_at?: string
          question?: string
          question_hash?: string
          response?: string
        }
        Relationships: []
      }
      matches: {
        Row: {
          compatibility_score: number | null
          created_at: string | null
          id: string
          user_id_1: string | null
          user_id_2: string | null
        }
        Insert: {
          compatibility_score?: number | null
          created_at?: string | null
          id?: string
          user_id_1?: string | null
          user_id_2?: string | null
        }
        Update: {
          compatibility_score?: number | null
          created_at?: string | null
          id?: string
          user_id_1?: string | null
          user_id_2?: string | null
        }
        Relationships: []
      }
      messages: {
        Row: {
          content: string
          created_at: string | null
          id: string
          is_from_diana: boolean | null
          is_read: boolean | null
          receiver_id: string | null
          sender_id: string | null
        }
        Insert: {
          content: string
          created_at?: string | null
          id?: string
          is_from_diana?: boolean | null
          is_read?: boolean | null
          receiver_id?: string | null
          sender_id?: string | null
        }
        Update: {
          content?: string
          created_at?: string | null
          id?: string
          is_from_diana?: boolean | null
          is_read?: boolean | null
          receiver_id?: string | null
          sender_id?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          age: number | null
          age_range_preference: unknown
          asked_questions: Json | null
          avatar_url: string | null
          created_at: string | null
          creative_hobbies: string[] | null
          cultural_activities: string[] | null
          current_question_index: number | null
          dietary_habits: string | null
          disabilities_and_special_need:
            | Database["public"]["Enums"]["yes_no_type"]
            | null
          disabilities_and_special_need_type: string | null
          drinking: Database["public"]["Enums"]["yes_no_type"] | null
          education_lvl: Database["public"]["Enums"]["education_level"] | null
          employment_status:
            | Database["public"]["Enums"]["employment_status"]
            | null
          gaming_hobbies: string[] | null
          gender: Database["public"]["Enums"]["gender_type"] | null
          have_children: Database["public"]["Enums"]["yes_no_type"] | null
          have_pet: Database["public"]["Enums"]["yes_no_type"] | null
          health: string | null
          health_disability_preference: string | null
          height: number | null
          height_preference: string | null
          id: string
          is_profile_complete: number | null
          job: string | null
          language: Database["public"]["Enums"]["language_type"] | null
          life_goal: string | null
          marital_status:
            | Database["public"]["Enums"]["marital_status_type"]
            | null
          name: string | null
          pet: string | null
          physical_activities: string[] | null
          practice_lvl: Database["public"]["Enums"]["practice_level"] | null
          profile_status:
            | Database["public"]["Enums"]["profile_status_type"]
            | null
          red_flags: string[] | null
          religion: Database["public"]["Enums"]["religion_type"] | null
          relocation_across_countries:
            | Database["public"]["Enums"]["yes_no_type"]
            | null
          relocation_same_country:
            | Database["public"]["Enums"]["yes_no_type"]
            | null
          role_in_relationship: string | null
          sleep_habits: string | null
          smoking: Database["public"]["Enums"]["yes_no_type"] | null
          travel_frequency: Database["public"]["Enums"]["frequency_type"] | null
          travel_planning: string | null
          travel_style: string | null
          type_of_trips: string | null
          updated_at: string | null
          volunteer_community_work:
            | Database["public"]["Enums"]["yes_no_type"]
            | null
          want_children: Database["public"]["Enums"]["yes_no_type"] | null
          where_he_live: string | null
          where_want_to_live: string | null
          where_was_born: string | null
          work_life_balance: string | null
        }
        Insert: {
          age?: number | null
          age_range_preference?: unknown
          asked_questions?: Json | null
          avatar_url?: string | null
          created_at?: string | null
          creative_hobbies?: string[] | null
          cultural_activities?: string[] | null
          current_question_index?: number | null
          dietary_habits?: string | null
          disabilities_and_special_need?:
            | Database["public"]["Enums"]["yes_no_type"]
            | null
          disabilities_and_special_need_type?: string | null
          drinking?: Database["public"]["Enums"]["yes_no_type"] | null
          education_lvl?: Database["public"]["Enums"]["education_level"] | null
          employment_status?:
            | Database["public"]["Enums"]["employment_status"]
            | null
          gaming_hobbies?: string[] | null
          gender?: Database["public"]["Enums"]["gender_type"] | null
          have_children?: Database["public"]["Enums"]["yes_no_type"] | null
          have_pet?: Database["public"]["Enums"]["yes_no_type"] | null
          health?: string | null
          health_disability_preference?: string | null
          height?: number | null
          height_preference?: string | null
          id: string
          is_profile_complete?: number | null
          job?: string | null
          language?: Database["public"]["Enums"]["language_type"] | null
          life_goal?: string | null
          marital_status?:
            | Database["public"]["Enums"]["marital_status_type"]
            | null
          name?: string | null
          pet?: string | null
          physical_activities?: string[] | null
          practice_lvl?: Database["public"]["Enums"]["practice_level"] | null
          profile_status?:
            | Database["public"]["Enums"]["profile_status_type"]
            | null
          red_flags?: string[] | null
          religion?: Database["public"]["Enums"]["religion_type"] | null
          relocation_across_countries?:
            | Database["public"]["Enums"]["yes_no_type"]
            | null
          relocation_same_country?:
            | Database["public"]["Enums"]["yes_no_type"]
            | null
          role_in_relationship?: string | null
          sleep_habits?: string | null
          smoking?: Database["public"]["Enums"]["yes_no_type"] | null
          travel_frequency?:
            | Database["public"]["Enums"]["frequency_type"]
            | null
          travel_planning?: string | null
          travel_style?: string | null
          type_of_trips?: string | null
          updated_at?: string | null
          volunteer_community_work?:
            | Database["public"]["Enums"]["yes_no_type"]
            | null
          want_children?: Database["public"]["Enums"]["yes_no_type"] | null
          where_he_live?: string | null
          where_want_to_live?: string | null
          where_was_born?: string | null
          work_life_balance?: string | null
        }
        Update: {
          age?: number | null
          age_range_preference?: unknown
          asked_questions?: Json | null
          avatar_url?: string | null
          created_at?: string | null
          creative_hobbies?: string[] | null
          cultural_activities?: string[] | null
          current_question_index?: number | null
          dietary_habits?: string | null
          disabilities_and_special_need?:
            | Database["public"]["Enums"]["yes_no_type"]
            | null
          disabilities_and_special_need_type?: string | null
          drinking?: Database["public"]["Enums"]["yes_no_type"] | null
          education_lvl?: Database["public"]["Enums"]["education_level"] | null
          employment_status?:
            | Database["public"]["Enums"]["employment_status"]
            | null
          gaming_hobbies?: string[] | null
          gender?: Database["public"]["Enums"]["gender_type"] | null
          have_children?: Database["public"]["Enums"]["yes_no_type"] | null
          have_pet?: Database["public"]["Enums"]["yes_no_type"] | null
          health?: string | null
          health_disability_preference?: string | null
          height?: number | null
          height_preference?: string | null
          id?: string
          is_profile_complete?: number | null
          job?: string | null
          language?: Database["public"]["Enums"]["language_type"] | null
          life_goal?: string | null
          marital_status?:
            | Database["public"]["Enums"]["marital_status_type"]
            | null
          name?: string | null
          pet?: string | null
          physical_activities?: string[] | null
          practice_lvl?: Database["public"]["Enums"]["practice_level"] | null
          profile_status?:
            | Database["public"]["Enums"]["profile_status_type"]
            | null
          red_flags?: string[] | null
          religion?: Database["public"]["Enums"]["religion_type"] | null
          relocation_across_countries?:
            | Database["public"]["Enums"]["yes_no_type"]
            | null
          relocation_same_country?:
            | Database["public"]["Enums"]["yes_no_type"]
            | null
          role_in_relationship?: string | null
          sleep_habits?: string | null
          smoking?: Database["public"]["Enums"]["yes_no_type"] | null
          travel_frequency?:
            | Database["public"]["Enums"]["frequency_type"]
            | null
          travel_planning?: string | null
          travel_style?: string | null
          type_of_trips?: string | null
          updated_at?: string | null
          volunteer_community_work?:
            | Database["public"]["Enums"]["yes_no_type"]
            | null
          want_children?: Database["public"]["Enums"]["yes_no_type"] | null
          where_he_live?: string | null
          where_want_to_live?: string | null
          where_was_born?: string | null
          work_life_balance?: string | null
        }
        Relationships: []
      }
      quotes: {
        Row: {
          author: string | null
          category: string | null
          content: string
          created_at: string | null
          id: string
        }
        Insert: {
          author?: string | null
          category?: string | null
          content: string
          created_at?: string | null
          id?: string
        }
        Update: {
          author?: string | null
          category?: string | null
          content?: string
          created_at?: string | null
          id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      clean_ai_cache: { Args: never; Returns: undefined }
    }
    Enums: {
      education_level:
        | "high_school"
        | "bachelor"
        | "master"
        | "phd"
        | "vocational"
        | "other"
      employment_status:
        | "employed"
        | "self_employed"
        | "student"
        | "unemployed"
        | "retired"
      frequency_type: "never" | "rarely" | "sometimes" | "often" | "very_often"
      gender_type: "male" | "female" | "other"
      language_type: "en" | "fr" | "ar" | "tn"
      marital_status_type: "single" | "divorced" | "widowed"
      practice_level:
        | "very_religious"
        | "religious"
        | "moderate"
        | "not_religious"
      profile_status_type: "incomplete" | "active" | "paused" | "hidden"
      religion_type:
        | "muslim"
        | "christian"
        | "jewish"
        | "buddhist"
        | "hindu"
        | "other"
        | "none"
      yes_no_type: "yes" | "no" | "prefer_not_to_say"
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
      education_level: [
        "high_school",
        "bachelor",
        "master",
        "phd",
        "vocational",
        "other",
      ],
      employment_status: [
        "employed",
        "self_employed",
        "student",
        "unemployed",
        "retired",
      ],
      frequency_type: ["never", "rarely", "sometimes", "often", "very_often"],
      gender_type: ["male", "female", "other"],
      language_type: ["en", "fr", "ar", "tn"],
      marital_status_type: ["single", "divorced", "widowed"],
      practice_level: [
        "very_religious",
        "religious",
        "moderate",
        "not_religious",
      ],
      profile_status_type: ["incomplete", "active", "paused", "hidden"],
      religion_type: [
        "muslim",
        "christian",
        "jewish",
        "buddhist",
        "hindu",
        "other",
        "none",
      ],
      yes_no_type: ["yes", "no", "prefer_not_to_say"],
    },
  },
} as const
