export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  public: {
    Tables: {
      reservations: { Row: Record<string, unknown>; Insert: Record<string, unknown>; Update: Record<string, unknown> };
      restaurant_tables: { Row: Record<string, unknown>; Insert: Record<string, unknown>; Update: Record<string, unknown> };
      menu_items: { Row: Record<string, unknown>; Insert: Record<string, unknown>; Update: Record<string, unknown> };
      orders: { Row: Record<string, unknown>; Insert: Record<string, unknown>; Update: Record<string, unknown> };
      staff_messages: { Row: Record<string, unknown>; Insert: Record<string, unknown>; Update: Record<string, unknown> };
      staff_invites: { Row: Record<string, unknown>; Insert: Record<string, unknown>; Update: Record<string, unknown> };
      offers: { Row: Record<string, unknown>; Insert: Record<string, unknown>; Update: Record<string, unknown> };
      profiles: { Row: Record<string, unknown>; Insert: Record<string, unknown>; Update: Record<string, unknown> };
      user_roles: { Row: Record<string, unknown>; Insert: Record<string, unknown>; Update: Record<string, unknown> };
      manager_sessions: { Row: Record<string, unknown>; Insert: Record<string, unknown>; Update: Record<string, unknown> };
    };
    Views: { [_ in never]: never };
    Functions: {
      staff_login_attempt: { Args: { p_key: string }; Returns: number };
      assign_reservation_table: { Args: { p_id: string; p_table: string; p_checkin: boolean }; Returns: unknown };
    };
    Enums: { [_ in never]: never };
  };
};
