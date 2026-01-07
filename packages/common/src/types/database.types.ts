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
      friendships: {
        Row: {
          created_at: string | null
          friend_id: string
          id: string
          status: Database["public"]["Enums"]["friendship_status"] | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          friend_id: string
          id?: string
          status?: Database["public"]["Enums"]["friendship_status"] | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          friend_id?: string
          id?: string
          status?: Database["public"]["Enums"]["friendship_status"] | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "friendships_friend_id_fkey"
            columns: ["friend_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "friendships_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      group_members: {
        Row: {
          group_id: string
          id: string
          joined_at: string | null
          role: Database["public"]["Enums"]["group_role"]
          user_id: string
        }
        Insert: {
          group_id: string
          id?: string
          joined_at?: string | null
          role?: Database["public"]["Enums"]["group_role"]
          user_id: string
        }
        Update: {
          group_id?: string
          id?: string
          joined_at?: string | null
          role?: Database["public"]["Enums"]["group_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "group_members_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "user_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "group_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          body: string
          created_at: string | null
          data: Json | null
          id: string
          read: boolean | null
          title: string
          type: Database["public"]["Enums"]["notification_type"]
          user_id: string
        }
        Insert: {
          body: string
          created_at?: string | null
          data?: Json | null
          id?: string
          read?: boolean | null
          title: string
          type: Database["public"]["Enums"]["notification_type"]
          user_id: string
        }
        Update: {
          body?: string
          created_at?: string | null
          data?: Json | null
          id?: string
          read?: boolean | null
          title?: string
          type?: Database["public"]["Enums"]["notification_type"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      otp_codes: {
        Row: {
          code: string
          created_at: string | null
          email: string
          expires_at: string
          id: string
          metadata: Json | null
          type: string
          used: boolean | null
        }
        Insert: {
          code: string
          created_at?: string | null
          email: string
          expires_at: string
          id?: string
          metadata?: Json | null
          type: string
          used?: boolean | null
        }
        Update: {
          code?: string
          created_at?: string | null
          email?: string
          expires_at?: string
          id?: string
          metadata?: Json | null
          type?: string
          used?: boolean | null
        }
        Relationships: []
      }
      settlement_history: {
        Row: {
          created_at: string | null
          days_late: number | null
          id: string
          penalty_amount: number | null
          settled_on_time: boolean
          tab_id: string | null
          trust_score_after: number | null
          trust_score_before: number | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          days_late?: number | null
          id?: string
          penalty_amount?: number | null
          settled_on_time: boolean
          tab_id?: string | null
          trust_score_after?: number | null
          trust_score_before?: number | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          days_late?: number | null
          id?: string
          penalty_amount?: number | null
          settled_on_time?: boolean
          tab_id?: string | null
          trust_score_after?: number | null
          trust_score_before?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "settlement_history_tab_id_fkey"
            columns: ["tab_id"]
            isOneToOne: false
            referencedRelation: "tabs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "settlement_history_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      tab_participants: {
        Row: {
          created_at: string | null
          days_late: number | null
          final_amount: number | null
          id: string
          otp_sent_at: string | null
          paid: boolean | null
          paid_amount: number | null
          paid_at: string | null
          paid_tx_hash: string | null
          penalty_amount: number | null
          settled_early: boolean | null
          share_amount: number
          tab_id: string | null
          updated_at: string | null
          user_id: string
          verification_deadline: string | null
          verified: boolean | null
        }
        Insert: {
          created_at?: string | null
          days_late?: number | null
          final_amount?: number | null
          id?: string
          otp_sent_at?: string | null
          paid?: boolean | null
          paid_amount?: number | null
          paid_at?: string | null
          paid_tx_hash?: string | null
          penalty_amount?: number | null
          settled_early?: boolean | null
          share_amount: number
          tab_id?: string | null
          updated_at?: string | null
          user_id: string
          verification_deadline?: string | null
          verified?: boolean | null
        }
        Update: {
          created_at?: string | null
          days_late?: number | null
          final_amount?: number | null
          id?: string
          otp_sent_at?: string | null
          paid?: boolean | null
          paid_amount?: number | null
          paid_at?: string | null
          paid_tx_hash?: string | null
          penalty_amount?: number | null
          settled_early?: boolean | null
          share_amount?: number
          tab_id?: string | null
          updated_at?: string | null
          user_id?: string
          verification_deadline?: string | null
          verified?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "tab_participants_tab_id_fkey"
            columns: ["tab_id"]
            isOneToOne: false
            referencedRelation: "tabs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tab_participants_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      tabs: {
        Row: {
          auto_settle_enabled: boolean | null
          category: Database["public"]["Enums"]["tab_category"] | null
          created_at: string | null
          creator_id: string
          currency: string | null
          description: string | null
          group_id: string | null
          id: string
          penalty_rate: number | null
          settlement_deadline: string | null
          status: Database["public"]["Enums"]["tab_status"] | null
          stream_channel_id: string | null
          title: string
          total_amount: number
          updated_at: string | null
        }
        Insert: {
          auto_settle_enabled?: boolean | null
          category?: Database["public"]["Enums"]["tab_category"] | null
          created_at?: string | null
          creator_id: string
          currency?: string | null
          description?: string | null
          group_id?: string | null
          id?: string
          penalty_rate?: number | null
          settlement_deadline?: string | null
          status?: Database["public"]["Enums"]["tab_status"] | null
          stream_channel_id?: string | null
          title: string
          total_amount: number
          updated_at?: string | null
        }
        Update: {
          auto_settle_enabled?: boolean | null
          category?: Database["public"]["Enums"]["tab_category"] | null
          created_at?: string | null
          creator_id?: string
          currency?: string | null
          description?: string | null
          group_id?: string | null
          id?: string
          penalty_rate?: number | null
          settlement_deadline?: string | null
          status?: Database["public"]["Enums"]["tab_status"] | null
          stream_channel_id?: string | null
          title?: string
          total_amount?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tabs_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tabs_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "user_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      transactions: {
        Row: {
          amount: number
          created_at: string | null
          currency: string | null
          from_user_id: string | null
          id: string
          status: string | null
          tab_id: string | null
          to_user_id: string | null
          tx_hash: string
          type: Database["public"]["Enums"]["transaction_type"]
        }
        Insert: {
          amount: number
          created_at?: string | null
          currency?: string | null
          from_user_id?: string | null
          id?: string
          status?: string | null
          tab_id?: string | null
          to_user_id?: string | null
          tx_hash: string
          type: Database["public"]["Enums"]["transaction_type"]
        }
        Update: {
          amount?: number
          created_at?: string | null
          currency?: string | null
          from_user_id?: string | null
          id?: string
          status?: string | null
          tab_id?: string | null
          to_user_id?: string | null
          tx_hash?: string
          type?: Database["public"]["Enums"]["transaction_type"]
        }
        Relationships: [
          {
            foreignKeyName: "transactions_from_user_id_fkey"
            columns: ["from_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_tab_id_fkey"
            columns: ["tab_id"]
            isOneToOne: false
            referencedRelation: "tabs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_to_user_id_fkey"
            columns: ["to_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      user_groups: {
        Row: {
          created_at: string | null
          creator_id: string
          description: string | null
          icon: string | null
          id: string
          name: string
          stream_channel_id: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          creator_id: string
          description?: string | null
          icon?: string | null
          id?: string
          name: string
          stream_channel_id?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          creator_id?: string
          description?: string | null
          icon?: string | null
          id?: string
          name?: string
          stream_channel_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_groups_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          auto_settle: boolean | null
          avatar_url: string | null
          avg_settlement_days: number | null
          created_at: string | null
          email: string | null
          id: string
          phone: string | null
          settlements_late: number | null
          settlements_on_time: number | null
          stream_token: string | null
          total_settlements: number | null
          trust_score: number | null
          updated_at: string | null
          username: string | null
          vault_address: string | null
          wallet_address: string
        }
        Insert: {
          auto_settle?: boolean | null
          avatar_url?: string | null
          avg_settlement_days?: number | null
          created_at?: string | null
          email?: string | null
          id: string
          phone?: string | null
          settlements_late?: number | null
          settlements_on_time?: number | null
          stream_token?: string | null
          total_settlements?: number | null
          trust_score?: number | null
          updated_at?: string | null
          username?: string | null
          vault_address?: string | null
          wallet_address: string
        }
        Update: {
          auto_settle?: boolean | null
          avatar_url?: string | null
          avg_settlement_days?: number | null
          created_at?: string | null
          email?: string | null
          id?: string
          phone?: string | null
          settlements_late?: number | null
          settlements_on_time?: number | null
          stream_token?: string | null
          total_settlements?: number | null
          trust_score?: number | null
          updated_at?: string | null
          username?: string | null
          vault_address?: string | null
          wallet_address?: string
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
      friendship_status: "PENDING" | "ACCEPTED" | "BLOCKED"
      group_role: "CREATOR" | "ADMIN" | "MEMBER"
      notification_type:
        | "FRIEND_REQUEST"
        | "FRIEND_ACCEPTED"
        | "TAB_CREATED"
        | "TAB_UPDATED"
        | "PAYMENT_RECEIVED"
        | "PAYMENT_REMINDER"
        | "TAB_SETTLED"
        | "MESSAGE_RECEIVED"
        | "TAB_PARTICIPATION"
        | "GROUP_CREATED"
        | "GROUP_MEMBER_ADDED"
        | "GROUP_MEMBER_REMOVED"
        | "GROUP_ROLE_UPDATED"
        | "GROUP_TAB_CREATED"
      tab_category:
        | "DINING"
        | "TRAVEL"
        | "GROCERIES"
        | "ENTERTAINMENT"
        | "UTILITIES"
        | "GIFTS"
        | "TRANSPORTATION"
        | "ACCOMMODATION"
        | "OTHER"
      tab_status: "OPEN" | "SETTLED" | "CANCELLED"
      transaction_type:
        | "PAYMENT"
        | "SETTLEMENT"
        | "VAULT_DEPOSIT"
        | "VAULT_WITHDRAWAL"
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
    Enums: {
      friendship_status: ["PENDING", "ACCEPTED", "BLOCKED"],
      group_role: ["CREATOR", "ADMIN", "MEMBER"],
      notification_type: [
        "FRIEND_REQUEST",
        "FRIEND_ACCEPTED",
        "TAB_CREATED",
        "TAB_UPDATED",
        "PAYMENT_RECEIVED",
        "PAYMENT_REMINDER",
        "TAB_SETTLED",
        "MESSAGE_RECEIVED",
        "TAB_PARTICIPATION",
        "GROUP_CREATED",
        "GROUP_MEMBER_ADDED",
        "GROUP_MEMBER_REMOVED",
        "GROUP_ROLE_UPDATED",
        "GROUP_TAB_CREATED",
      ],
      tab_category: [
        "DINING",
        "TRAVEL",
        "GROCERIES",
        "ENTERTAINMENT",
        "UTILITIES",
        "GIFTS",
        "TRANSPORTATION",
        "ACCOMMODATION",
        "OTHER",
      ],
      tab_status: ["OPEN", "SETTLED", "CANCELLED"],
      transaction_type: [
        "PAYMENT",
        "SETTLEMENT",
        "VAULT_DEPOSIT",
        "VAULT_WITHDRAWAL",
      ],
    },
  },
} as const
