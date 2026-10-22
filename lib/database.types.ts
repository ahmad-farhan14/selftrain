export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

type Table<Row, Insert, Update = Partial<Insert>> = {
  Row: Row;
  Insert: Insert;
  Update: Update;
  Relationships: [];
};

export type Database = {
  public: {
    Tables: {
      profiles: Table<
        { id: string; email: string; full_name: string | null; target_calories: number | null; target_protein: number | null; created_at: string | null },
        { id: string; email: string; full_name?: string | null; target_calories?: number | null; target_protein?: number | null; created_at?: string | null }
      >;
      workout_logs: Table<
        { id: string; user_id: string; exercise_name: string; weight_kg: number; reps: number; set_number: number; muscle_group: string | null; logged_at: string | null },
        { id?: string; user_id: string; exercise_name: string; weight_kg: number; reps: number; set_number: number; muscle_group?: string | null; logged_at?: string | null }
      >;
      nutrition_logs: Table<
        { id: string; user_id: string; calories: number; protein_g: number | null; carbs_g: number | null; fat_g: number | null; logged_at: string | null },
        { id?: string; user_id: string; calories: number; protein_g?: number | null; carbs_g?: number | null; fat_g?: number | null; logged_at?: string | null }
      >;
      custom_exercises: Table<
        { id: string; user_id: string; name: string; muscle_group: string; created_at: string | null },
        { id?: string; user_id: string; name: string; muscle_group: string; created_at?: string | null }
      >;
      active_workouts: Table<
        { user_id: string; workout: Json; updated_at: string | null },
        { user_id: string; workout: Json; updated_at?: string | null }
      >;
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
