export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
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
      activity_log: {
        Row: {
          actor_id: string
          created_at: string
          id: string
          idea_id: string | null
          message: string
          type: string
          workspace_id: string
        }
        Insert: {
          actor_id: string
          created_at?: string
          id?: string
          idea_id?: string | null
          message: string
          type: string
          workspace_id: string
        }
        Update: {
          actor_id?: string
          created_at?: string
          id?: string
          idea_id?: string | null
          message?: string
          type?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "activity_log_idea_id_fkey"
            columns: ["idea_id"]
            isOneToOne: false
            referencedRelation: "ideas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activity_log_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      attachments: {
        Row: {
          created_at: string
          deleted_at: string | null
          file_name: string
          file_path: string
          file_size: number
          id: string
          idea_id: string
          mime_type: string
          uploaded_by: string
          workspace_id: string
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          file_name: string
          file_path: string
          file_size: number
          id?: string
          idea_id: string
          mime_type: string
          uploaded_by: string
          workspace_id: string
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          file_name?: string
          file_path?: string
          file_size?: number
          id?: string
          idea_id?: string
          mime_type?: string
          uploaded_by?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "attachments_idea_id_fkey"
            columns: ["idea_id"]
            isOneToOne: false
            referencedRelation: "ideas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attachments_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      board_templates: {
        Row: {
          columns_config: Json
          created_at: string
          id: string
          is_system: boolean
          title: string
          user_id: string | null
        }
        Insert: {
          columns_config: Json
          created_at?: string
          id?: string
          is_system?: boolean
          title: string
          user_id?: string | null
        }
        Update: {
          columns_config?: Json
          created_at?: string
          id?: string
          is_system?: boolean
          title?: string
          user_id?: string | null
        }
        Relationships: []
      }
      comments: {
        Row: {
          content: string
          created_at: string
          deleted_at: string | null
          deleted_by: string | null
          id: string
          idea_id: string
          mentioned_user_ids: string[] | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          deleted_at?: string | null
          deleted_by?: string | null
          id?: string
          idea_id: string
          mentioned_user_ids?: string[] | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          deleted_at?: string | null
          deleted_by?: string | null
          id?: string
          idea_id?: string
          mentioned_user_ids?: string[] | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "comments_idea_id_fkey"
            columns: ["idea_id"]
            isOneToOne: false
            referencedRelation: "ideas"
            referencedColumns: ["id"]
          },
        ]
      }
      idea_tags: {
        Row: {
          idea_id: string
          tag_id: string
        }
        Insert: {
          idea_id: string
          tag_id: string
        }
        Update: {
          idea_id?: string
          tag_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "idea_tags_idea_id_fkey"
            columns: ["idea_id"]
            isOneToOne: false
            referencedRelation: "ideas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "idea_tags_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "tags"
            referencedColumns: ["id"]
          },
        ]
      }
      idea_versions: {
        Row: {
          content: string
          created_at: string
          created_by: string
          effort_score:
            | Database["public"]["Enums"]["impact_effort_level"]
            | null
          id: string
          idea_id: string
          impact_score:
            | Database["public"]["Enums"]["impact_effort_level"]
            | null
          problem_statement: string | null
          target_audience: string | null
          title: string
          version_number: number
        }
        Insert: {
          content: string
          created_at?: string
          created_by: string
          effort_score?:
            | Database["public"]["Enums"]["impact_effort_level"]
            | null
          id?: string
          idea_id: string
          impact_score?:
            | Database["public"]["Enums"]["impact_effort_level"]
            | null
          problem_statement?: string | null
          target_audience?: string | null
          title: string
          version_number: number
        }
        Update: {
          content?: string
          created_at?: string
          created_by?: string
          effort_score?:
            | Database["public"]["Enums"]["impact_effort_level"]
            | null
          id?: string
          idea_id?: string
          impact_score?:
            | Database["public"]["Enums"]["impact_effort_level"]
            | null
          problem_statement?: string | null
          target_audience?: string | null
          title?: string
          version_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "idea_versions_idea_id_fkey"
            columns: ["idea_id"]
            isOneToOne: false
            referencedRelation: "ideas"
            referencedColumns: ["id"]
          },
        ]
      }
      idea_votes: {
        Row: {
          created_at: string
          id: string
          idea_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          idea_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          idea_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "idea_votes_idea_id_fkey"
            columns: ["idea_id"]
            isOneToOne: false
            referencedRelation: "ideas"
            referencedColumns: ["id"]
          },
        ]
      }
      ideas: {
        Row: {
          assignee_id: string | null
          cancellation_reason: string | null
          column_id: string
          created_at: string
          created_by: string
          current_version: number
          deleted_at: string | null
          deleted_by: string | null
          id: string
          updated_at: string
          workspace_id: string
        }
        Insert: {
          assignee_id?: string | null
          cancellation_reason?: string | null
          column_id: string
          created_at?: string
          created_by: string
          current_version?: number
          deleted_at?: string | null
          deleted_by?: string | null
          id?: string
          updated_at?: string
          workspace_id: string
        }
        Update: {
          assignee_id?: string | null
          cancellation_reason?: string | null
          column_id?: string
          created_at?: string
          created_by?: string
          current_version?: number
          deleted_at?: string | null
          deleted_by?: string | null
          id?: string
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ideas_column_id_fkey"
            columns: ["column_id"]
            isOneToOne: false
            referencedRelation: "kanban_columns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ideas_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      kanban_columns: {
        Row: {
          created_at: string
          id: string
          order: number
          status_type: Database["public"]["Enums"]["status_type"]
          title: string
          workspace_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          order?: number
          status_type?: Database["public"]["Enums"]["status_type"]
          title: string
          workspace_id: string
        }
        Update: {
          created_at?: string
          id?: string
          order?: number
          status_type?: Database["public"]["Enums"]["status_type"]
          title?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "kanban_columns_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          actor_id: string
          created_at: string
          id: string
          idea_id: string
          is_read: boolean
          message: string
          user_id: string
        }
        Insert: {
          actor_id: string
          created_at?: string
          id?: string
          idea_id: string
          is_read?: boolean
          message: string
          user_id: string
        }
        Update: {
          actor_id?: string
          created_at?: string
          id?: string
          idea_id?: string
          is_read?: boolean
          message?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_idea_id_fkey"
            columns: ["idea_id"]
            isOneToOne: false
            referencedRelation: "ideas"
            referencedColumns: ["id"]
          },
        ]
      }
      tags: {
        Row: {
          color: string
          created_at: string
          id: string
          name: string
          workspace_id: string
        }
        Insert: {
          color?: string
          created_at?: string
          id?: string
          name: string
          workspace_id: string
        }
        Update: {
          color?: string
          created_at?: string
          id?: string
          name?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tags_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      user_presence: {
        Row: {
          last_seen_at: string
          user_id: string
        }
        Insert: {
          last_seen_at?: string
          user_id: string
        }
        Update: {
          last_seen_at?: string
          user_id?: string
        }
        Relationships: []
      }
      workspace_members: {
        Row: {
          id: string
          joined_at: string
          role: Database["public"]["Enums"]["workspace_role"]
          status: Database["public"]["Enums"]["workspace_member_status"]
          user_id: string
          workspace_id: string
        }
        Insert: {
          id?: string
          joined_at?: string
          role?: Database["public"]["Enums"]["workspace_role"]
          status?: Database["public"]["Enums"]["workspace_member_status"]
          user_id: string
          workspace_id: string
        }
        Update: {
          id?: string
          joined_at?: string
          role?: Database["public"]["Enums"]["workspace_role"]
          status?: Database["public"]["Enums"]["workspace_member_status"]
          user_id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workspace_members_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      workspaces: {
        Row: {
          created_at: string
          default_invite_role: Database["public"]["Enums"]["workspace_role"]
          description: string | null
          id: string
          invite_code: string
          title: string
        }
        Insert: {
          created_at?: string
          default_invite_role?: Database["public"]["Enums"]["workspace_role"]
          description?: string | null
          id?: string
          invite_code?: string
          title: string
        }
        Update: {
          created_at?: string
          default_invite_role?: Database["public"]["Enums"]["workspace_role"]
          description?: string | null
          id?: string
          invite_code?: string
          title?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      accept_workspace_invite: {
        Args: { _workspace_id: string }
        Returns: {
          id: string
          joined_at: string
          role: Database["public"]["Enums"]["workspace_role"]
          status: Database["public"]["Enums"]["workspace_member_status"]
          user_id: string
          workspace_id: string
        }
        SetofOptions: {
          from: "*"
          to: "workspace_members"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      assign_idea: {
        Args: { _assignee_user_id?: string; _idea_id: string }
        Returns: {
          assignee_id: string | null
          cancellation_reason: string | null
          column_id: string
          created_at: string
          created_by: string
          current_version: number
          deleted_at: string | null
          deleted_by: string | null
          id: string
          updated_at: string
          workspace_id: string
        }
        SetofOptions: {
          from: "*"
          to: "ideas"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      create_idea: {
        Args: {
          _column_id: string
          _content: string
          _effort_score?: Database["public"]["Enums"]["impact_effort_level"]
          _impact_score?: Database["public"]["Enums"]["impact_effort_level"]
          _problem_statement?: string
          _target_audience?: string
          _title: string
          _workspace_id: string
        }
        Returns: {
          assignee_id: string | null
          cancellation_reason: string | null
          column_id: string
          created_at: string
          created_by: string
          current_version: number
          deleted_at: string | null
          deleted_by: string | null
          id: string
          updated_at: string
          workspace_id: string
        }
        SetofOptions: {
          from: "*"
          to: "ideas"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      create_workspace:
        | {
            Args: { _template_id?: string; _title: string }
            Returns: {
              created_at: string
              default_invite_role: Database["public"]["Enums"]["workspace_role"]
              description: string | null
              id: string
              invite_code: string
              title: string
            }
            SetofOptions: {
              from: "*"
              to: "workspaces"
              isOneToOne: true
              isSetofReturn: false
            }
          }
        | {
            Args: {
              _description?: string
              _template_id?: string
              _title: string
            }
            Returns: {
              created_at: string
              default_invite_role: Database["public"]["Enums"]["workspace_role"]
              description: string | null
              id: string
              invite_code: string
              title: string
            }
            SetofOptions: {
              from: "*"
              to: "workspaces"
              isOneToOne: true
              isSetofReturn: false
            }
          }
      get_workspace_member_count: {
        Args: { _workspace_id: string }
        Returns: number
      }
      hard_delete_attachment: {
        Args: { _attachment_id: string }
        Returns: {
          created_at: string
          deleted_at: string | null
          file_name: string
          file_path: string
          file_size: number
          id: string
          idea_id: string
          mime_type: string
          uploaded_by: string
          workspace_id: string
        }
        SetofOptions: {
          from: "*"
          to: "attachments"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      is_workspace_contributor: {
        Args: { _workspace_id: string }
        Returns: boolean
      }
      is_workspace_member: { Args: { _workspace_id: string }; Returns: boolean }
      is_workspace_member_any_status: {
        Args: { _workspace_id: string }
        Returns: boolean
      }
      is_workspace_owner: { Args: { _workspace_id: string }; Returns: boolean }
      is_workspace_owner_or_admin: {
        Args: { _workspace_id: string }
        Returns: boolean
      }
      join_workspace_by_invite_code: {
        Args: { _invite_code: string }
        Returns: {
          created_at: string
          default_invite_role: Database["public"]["Enums"]["workspace_role"]
          description: string | null
          id: string
          invite_code: string
          title: string
        }
        SetofOptions: {
          from: "*"
          to: "workspaces"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      move_idea: {
        Args: {
          _cancellation_reason?: string
          _idea_id: string
          _target_column_id: string
        }
        Returns: {
          assignee_id: string | null
          cancellation_reason: string | null
          column_id: string
          created_at: string
          created_by: string
          current_version: number
          deleted_at: string | null
          deleted_by: string | null
          id: string
          updated_at: string
          workspace_id: string
        }
        SetofOptions: {
          from: "*"
          to: "ideas"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      soft_delete_attachment: {
        Args: { _attachment_id: string }
        Returns: {
          created_at: string
          deleted_at: string | null
          file_name: string
          file_path: string
          file_size: number
          id: string
          idea_id: string
          mime_type: string
          uploaded_by: string
          workspace_id: string
        }
        SetofOptions: {
          from: "*"
          to: "attachments"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      soft_delete_comment: {
        Args: { _comment_id: string }
        Returns: {
          content: string
          created_at: string
          deleted_at: string | null
          deleted_by: string | null
          id: string
          idea_id: string
          mentioned_user_ids: string[] | null
          updated_at: string | null
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "comments"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      soft_delete_idea: {
        Args: { _idea_id: string }
        Returns: {
          assignee_id: string | null
          cancellation_reason: string | null
          column_id: string
          created_at: string
          created_by: string
          current_version: number
          deleted_at: string | null
          deleted_by: string | null
          id: string
          updated_at: string
          workspace_id: string
        }
        SetofOptions: {
          from: "*"
          to: "ideas"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      transfer_workspace_ownership: {
        Args: { _new_owner_user_id: string; _workspace_id: string }
        Returns: undefined
      }
      undo_delete_attachment: {
        Args: { _attachment_id: string }
        Returns: {
          created_at: string
          deleted_at: string | null
          file_name: string
          file_path: string
          file_size: number
          id: string
          idea_id: string
          mime_type: string
          uploaded_by: string
          workspace_id: string
        }
        SetofOptions: {
          from: "*"
          to: "attachments"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      undo_delete_comment: {
        Args: { _comment_id: string }
        Returns: {
          content: string
          created_at: string
          deleted_at: string | null
          deleted_by: string | null
          id: string
          idea_id: string
          mentioned_user_ids: string[] | null
          updated_at: string | null
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "comments"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      undo_delete_idea: {
        Args: { _idea_id: string }
        Returns: {
          assignee_id: string | null
          cancellation_reason: string | null
          column_id: string
          created_at: string
          created_by: string
          current_version: number
          deleted_at: string | null
          deleted_by: string | null
          id: string
          updated_at: string
          workspace_id: string
        }
        SetofOptions: {
          from: "*"
          to: "ideas"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      update_idea: {
        Args: {
          _content: string
          _effort_score?: Database["public"]["Enums"]["impact_effort_level"]
          _idea_id: string
          _impact_score?: Database["public"]["Enums"]["impact_effort_level"]
          _problem_statement?: string
          _target_audience?: string
          _title: string
        }
        Returns: {
          assignee_id: string | null
          cancellation_reason: string | null
          column_id: string
          created_at: string
          created_by: string
          current_version: number
          deleted_at: string | null
          deleted_by: string | null
          id: string
          updated_at: string
          workspace_id: string
        }
        SetofOptions: {
          from: "*"
          to: "ideas"
          isOneToOne: true
          isSetofReturn: false
        }
      }
    }
    Enums: {
      impact_effort_level: "LOW" | "MEDIUM" | "HIGH"
      status_type: "DRAFT" | "IN_REVIEW" | "APPROVED" | "CANCELLED" | "DONE"
      workspace_member_status: "PENDING" | "ACTIVE"
      workspace_role: "OWNER" | "MEMBER" | "ADMIN" | "VIEWER"
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
      impact_effort_level: ["LOW", "MEDIUM", "HIGH"],
      status_type: ["DRAFT", "IN_REVIEW", "APPROVED", "CANCELLED", "DONE"],
      workspace_member_status: ["PENDING", "ACTIVE"],
      workspace_role: ["OWNER", "MEMBER", "ADMIN", "VIEWER"],
    },
  },
} as const

