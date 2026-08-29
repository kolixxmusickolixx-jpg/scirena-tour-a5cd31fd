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
      activity_log: {
        Row: {
          action: string
          actor_email: string
          actor_id: string | null
          actor_name: string
          actor_role: string
          created_at: string
          details: Json
          entity: string
          id: string
          object_id: string
          object_label: string
        }
        Insert: {
          action: string
          actor_email?: string
          actor_id?: string | null
          actor_name?: string
          actor_role?: string
          created_at?: string
          details?: Json
          entity?: string
          id?: string
          object_id?: string
          object_label?: string
        }
        Update: {
          action?: string
          actor_email?: string
          actor_id?: string | null
          actor_name?: string
          actor_role?: string
          created_at?: string
          details?: Json
          entity?: string
          id?: string
          object_id?: string
          object_label?: string
        }
        Relationships: []
      }
      admin_2fa_challenges: {
        Row: {
          attempts: number
          code_hash: string
          consumed_at: string | null
          created_at: string
          email: string
          expires_at: string
          grant_expires_at: string | null
          grant_token: string | null
          id: string
          last_sent_at: string
          sends: number
          user_id: string
        }
        Insert: {
          attempts?: number
          code_hash: string
          consumed_at?: string | null
          created_at?: string
          email: string
          expires_at: string
          grant_expires_at?: string | null
          grant_token?: string | null
          id?: string
          last_sent_at?: string
          sends?: number
          user_id: string
        }
        Update: {
          attempts?: number
          code_hash?: string
          consumed_at?: string | null
          created_at?: string
          email?: string
          expires_at?: string
          grant_expires_at?: string | null
          grant_token?: string | null
          id?: string
          last_sent_at?: string
          sends?: number
          user_id?: string
        }
        Relationships: []
      }
      admin_2fa_verifications: {
        Row: {
          expires_at: string
          id: string
          user_id: string
          verified_at: string
        }
        Insert: {
          expires_at: string
          id?: string
          user_id: string
          verified_at?: string
        }
        Update: {
          expires_at?: string
          id?: string
          user_id?: string
          verified_at?: string
        }
        Relationships: []
      }
      admin_users: {
        Row: {
          active: boolean
          avatar_url: string
          created_at: string
          email: string
          last_login_at: string | null
          must_change_password: boolean
          name: string
          role: string
          updated_at: string
          user_id: string
        }
        Insert: {
          active?: boolean
          avatar_url?: string
          created_at?: string
          email: string
          last_login_at?: string | null
          must_change_password?: boolean
          name?: string
          role?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          active?: boolean
          avatar_url?: string
          created_at?: string
          email?: string
          last_login_at?: string | null
          must_change_password?: boolean
          name?: string
          role?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      analytics_events: {
        Row: {
          country: string
          created_at: string
          device: string
          duration_ms: number
          event_name: string
          id: string
          path: string
          props: Json
          session_id: string
          source: string
          visitor_id: string
        }
        Insert: {
          country?: string
          created_at?: string
          device?: string
          duration_ms?: number
          event_name: string
          id?: string
          path?: string
          props?: Json
          session_id: string
          source?: string
          visitor_id: string
        }
        Update: {
          country?: string
          created_at?: string
          device?: string
          duration_ms?: number
          event_name?: string
          id?: string
          path?: string
          props?: Json
          session_id?: string
          source?: string
          visitor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "analytics_events_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "analytics_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      analytics_sessions: {
        Row: {
          country: string
          device: string
          entry_path: string
          id: string
          is_new: boolean
          last_seen_at: string
          page_views: number
          referrer_host: string
          source: string
          started_at: string
          visitor_id: string
        }
        Insert: {
          country?: string
          device?: string
          entry_path?: string
          id: string
          is_new?: boolean
          last_seen_at?: string
          page_views?: number
          referrer_host?: string
          source?: string
          started_at?: string
          visitor_id: string
        }
        Update: {
          country?: string
          device?: string
          entry_path?: string
          id?: string
          is_new?: boolean
          last_seen_at?: string
          page_views?: number
          referrer_host?: string
          source?: string
          started_at?: string
          visitor_id?: string
        }
        Relationships: []
      }
      faq_items: {
        Row: {
          answer: string
          created_at: string
          id: string
          question: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          answer: string
          created_at?: string
          id?: string
          question: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          answer?: string
          created_at?: string
          id?: string
          question?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      gallery_albums: {
        Row: {
          cover_url: string
          created_at: string
          date_label: string
          id: string
          sort_order: number
          title: string
          updated_at: string
        }
        Insert: {
          cover_url?: string
          created_at?: string
          date_label?: string
          id?: string
          sort_order?: number
          title: string
          updated_at?: string
        }
        Update: {
          cover_url?: string
          created_at?: string
          date_label?: string
          id?: string
          sort_order?: number
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      gallery_photos: {
        Row: {
          album_id: string
          created_at: string
          height: number | null
          id: string
          sort_order: number
          storage_path: string
          updated_at: string
          url: string
          width: number | null
        }
        Insert: {
          album_id: string
          created_at?: string
          height?: number | null
          id?: string
          sort_order?: number
          storage_path: string
          updated_at?: string
          url: string
          width?: number | null
        }
        Update: {
          album_id?: string
          created_at?: string
          height?: number | null
          id?: string
          sort_order?: number
          storage_path?: string
          updated_at?: string
          url?: string
          width?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "gallery_photos_album_id_fkey"
            columns: ["album_id"]
            isOneToOne: false
            referencedRelation: "gallery_albums"
            referencedColumns: ["id"]
          },
        ]
      }
      media_items: {
        Row: {
          created_at: string
          description: string
          id: string
          kind: string
          published: boolean
          sort_order: number
          thumb_url: string
          title: string
          updated_at: string
          video_url: string
        }
        Insert: {
          created_at?: string
          description?: string
          id?: string
          kind?: string
          published?: boolean
          sort_order?: number
          thumb_url?: string
          title?: string
          updated_at?: string
          video_url?: string
        }
        Update: {
          created_at?: string
          description?: string
          id?: string
          kind?: string
          published?: boolean
          sort_order?: number
          thumb_url?: string
          title?: string
          updated_at?: string
          video_url?: string
        }
        Relationships: []
      }
      releases: {
        Row: {
          apple_url: string | null
          cover_path: string | null
          created_at: string
          id: string
          published: boolean
          release_type: string
          sort_order: number
          spotify_url: string | null
          title: string
          updated_at: string
          vk_url: string | null
          yandex_url: string | null
        }
        Insert: {
          apple_url?: string | null
          cover_path?: string | null
          created_at?: string
          id?: string
          published?: boolean
          release_type?: string
          sort_order?: number
          spotify_url?: string | null
          title?: string
          updated_at?: string
          vk_url?: string | null
          yandex_url?: string | null
        }
        Update: {
          apple_url?: string | null
          cover_path?: string | null
          created_at?: string
          id?: string
          published?: boolean
          release_type?: string
          sort_order?: number
          spotify_url?: string | null
          title?: string
          updated_at?: string
          vk_url?: string | null
          yandex_url?: string | null
        }
        Relationships: []
      }
      shows: {
        Row: {
          city: string
          created_at: string
          date_label: string
          day_label: string
          id: string
          sort_order: number
          status: string
          ticket_url: string
          updated_at: string
          venue: string
        }
        Insert: {
          city: string
          created_at?: string
          date_label: string
          day_label?: string
          id?: string
          sort_order?: number
          status?: string
          ticket_url?: string
          updated_at?: string
          venue: string
        }
        Update: {
          city?: string
          created_at?: string
          date_label?: string
          day_label?: string
          id?: string
          sort_order?: number
          status?: string
          ticket_url?: string
          updated_at?: string
          venue?: string
        }
        Relationships: []
      }
      site_content: {
        Row: {
          key: string
          updated_at: string
          value: string
        }
        Insert: {
          key: string
          updated_at?: string
          value?: string
        }
        Update: {
          key?: string
          updated_at?: string
          value?: string
        }
        Relationships: []
      }
      social_links: {
        Row: {
          created_at: string
          id: string
          label: string
          sort_order: number
          updated_at: string
          url: string
        }
        Insert: {
          created_at?: string
          id?: string
          label: string
          sort_order?: number
          updated_at?: string
          url?: string
        }
        Update: {
          created_at?: string
          id?: string
          label?: string
          sort_order?: number
          updated_at?: string
          url?: string
        }
        Relationships: []
      }
      support_messages: {
        Row: {
          body: string
          created_at: string
          id: string
          sender: string
          ticket_id: string
        }
        Insert: {
          body: string
          created_at?: string
          id?: string
          sender?: string
          ticket_id: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          sender?: string
          ticket_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "support_messages_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "support_tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      support_tickets: {
        Row: {
          access_code: string
          created_at: string
          email: string
          id: string
          name: string
          status: string
          subject: string
          updated_at: string
        }
        Insert: {
          access_code: string
          created_at?: string
          email: string
          id?: string
          name: string
          status?: string
          subject?: string
          updated_at?: string
        }
        Update: {
          access_code?: string
          created_at?: string
          email?: string
          id?: string
          name?: string
          status?: string
          subject?: string
          updated_at?: string
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
      [_ in never]: never
    }
    Functions: {
      admin_delete_user: { Args: { p_user_id: string }; Returns: Json }
      admin_mark_temp_password: { Args: { p_user_id: string }; Returns: Json }
      admin_me: { Args: never; Returns: Json }
      admin_password_changed: { Args: never; Returns: undefined }
      admin_role: { Args: never; Returns: string }
      admin_set_name: {
        Args: { p_name: string; p_user_id: string }
        Returns: Json
      }
      admin_touch_login: { Args: never; Returns: Json }
      admin_update_profile: {
        Args: { p_avatar_url: string; p_name: string }
        Returns: Json
      }
      admin_upsert_user: {
        Args: { p_email: string; p_role: string; p_user_id: string }
        Returns: Json
      }
      analytics_track: {
        Args: {
          p_country: string
          p_device: string
          p_duration_ms: number
          p_event: string
          p_is_new: boolean
          p_path: string
          p_props: Json
          p_referrer_host: string
          p_session_id: string
          p_source: string
          p_visitor_id: string
        }
        Returns: Json
      }
      can_manage: { Args: { _section: string }; Returns: boolean }
      claim_admin: { Args: never; Returns: boolean }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_full_admin: { Args: never; Returns: boolean }
      log_activity: {
        Args: {
          p_action: string
          p_details?: Json
          p_entity?: string
          p_object_id?: string
          p_object_label?: string
        }
        Returns: Json
      }
      reorder_items: {
        Args: { p_ids: string[]; p_table: string }
        Returns: undefined
      }
      support_create_ticket: {
        Args: { p_email: string; p_message: string; p_name: string }
        Returns: Json
      }
      support_find_tickets: {
        Args: { p_code: string; p_email: string }
        Returns: Json
      }
      support_get_thread: {
        Args: { p_code: string; p_ticket_id: string }
        Returns: Json
      }
      support_send_message: {
        Args: { p_body: string; p_code: string; p_ticket_id: string }
        Returns: Json
      }
      twofa_claim_grant: {
        Args: { p_grant_token: string; p_ttl_hours: number }
        Returns: Json
      }
      twofa_create_challenge: {
        Args: {
          p_code_hash: string
          p_email: string
          p_expires_at: string
          p_id: string
          p_max_per_hour: number
          p_user_id: string
        }
        Returns: Json
      }
      twofa_is_verified: { Args: never; Returns: boolean }
      twofa_resend: {
        Args: {
          p_code_hash: string
          p_cooldown_sec: number
          p_expires_at: string
          p_id: string
          p_max_sends: number
        }
        Returns: Json
      }
      twofa_revoke: { Args: never; Returns: undefined }
      twofa_verify: {
        Args: {
          p_code_hash: string
          p_grant_token: string
          p_grant_ttl_sec: number
          p_id: string
          p_max_attempts: number
        }
        Returns: Json
      }
      write_activity: {
        Args: {
          p_action: string
          p_details: Json
          p_entity: string
          p_object_id: string
          p_object_label: string
        }
        Returns: undefined
      }
    }
    Enums: {
      app_role: "admin" | "user"
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
    },
  },
} as const
