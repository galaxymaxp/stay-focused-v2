export type Json =
  | string
  | number
  | boolean
  | null
  | { readonly [key: string]: Json | undefined }
  | readonly Json[];

export type SavedReviewerSourceMode = "paste" | "gallery" | "camera" | "pdf";

export interface SavedReviewerSourceMetadata {
  readonly sourceMode: SavedReviewerSourceMode;
  readonly sourceCharacterCount: number;
  readonly pdfPageCount?: number;
  readonly sourceLabel?: string;
}

export interface SavedReviewerSummary {
  readonly id: string;
  readonly title: string;
  readonly sourceMetadata: SavedReviewerSourceMetadata;
  readonly sectionCount: number;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface SavedReviewerDetail<TReviewerOutput = Json>
  extends SavedReviewerSummary {
  readonly reviewerOutput: TReviewerOutput;
}

export type ReviewerRow = Database["public"]["Tables"]["reviewers"]["Row"];
export type ReviewerInsert =
  Database["public"]["Tables"]["reviewers"]["Insert"];
export type ReviewerUpdate =
  Database["public"]["Tables"]["reviewers"]["Update"];
export type CanvasConnectionRow =
  Database["public"]["Tables"]["canvas_connections"]["Row"];
export type CanvasConnectionInsert =
  Database["public"]["Tables"]["canvas_connections"]["Insert"];
export type CanvasConnectionUpdate =
  Database["public"]["Tables"]["canvas_connections"]["Update"];
export type CanvasCapabilityRow =
  Database["public"]["Tables"]["canvas_capabilities"]["Row"];
export type CanvasCapabilityInsert =
  Database["public"]["Tables"]["canvas_capabilities"]["Insert"];
export type CanvasCapabilityUpdate =
  Database["public"]["Tables"]["canvas_capabilities"]["Update"];
export type CanvasCourseRow =
  Database["public"]["Tables"]["canvas_courses"]["Row"];
export type CanvasCourseInsert =
  Database["public"]["Tables"]["canvas_courses"]["Insert"];
export type CanvasCourseUpdate =
  Database["public"]["Tables"]["canvas_courses"]["Update"];
export type CanvasModuleRow =
  Database["public"]["Tables"]["canvas_modules"]["Row"];
export type CanvasModuleInsert =
  Database["public"]["Tables"]["canvas_modules"]["Insert"];
export type CanvasModuleUpdate =
  Database["public"]["Tables"]["canvas_modules"]["Update"];
export type CanvasModuleItemRow =
  Database["public"]["Tables"]["canvas_module_items"]["Row"];
export type CanvasModuleItemInsert =
  Database["public"]["Tables"]["canvas_module_items"]["Insert"];
export type CanvasModuleItemUpdate =
  Database["public"]["Tables"]["canvas_module_items"]["Update"];
export type CanvasPageRow =
  Database["public"]["Tables"]["canvas_pages"]["Row"];
export type CanvasPageInsert =
  Database["public"]["Tables"]["canvas_pages"]["Insert"];
export type CanvasPageUpdate =
  Database["public"]["Tables"]["canvas_pages"]["Update"];
export type CanvasAssignmentGroupRow =
  Database["public"]["Tables"]["canvas_assignment_groups"]["Row"];
export type CanvasAssignmentGroupInsert =
  Database["public"]["Tables"]["canvas_assignment_groups"]["Insert"];
export type CanvasAssignmentGroupUpdate =
  Database["public"]["Tables"]["canvas_assignment_groups"]["Update"];
export type CanvasAssignmentRow =
  Database["public"]["Tables"]["canvas_assignments"]["Row"];
export type CanvasAssignmentInsert =
  Database["public"]["Tables"]["canvas_assignments"]["Insert"];
export type CanvasAssignmentUpdate =
  Database["public"]["Tables"]["canvas_assignments"]["Update"];

export interface Database {
  public: {
    Tables: {
      canvas_capabilities: {
        Row: {
          id: string;
          user_id: string;
          canvas_connection_id: string;
          capability: string;
          status: string;
          tested_at: string | null;
          safe_error_code: string | null;
          course_id: string | null;
          integration_version: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          canvas_connection_id: string;
          capability: string;
          status: string;
          tested_at?: string | null;
          safe_error_code?: string | null;
          course_id?: string | null;
          integration_version?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          canvas_connection_id?: string;
          capability?: string;
          status?: string;
          tested_at?: string | null;
          safe_error_code?: string | null;
          course_id?: string | null;
          integration_version?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "canvas_capabilities_connection_user_fkey";
            columns: ["canvas_connection_id", "user_id"];
            isOneToOne: false;
            referencedRelation: "canvas_connections";
            referencedColumns: ["id", "user_id"];
          },
          {
            foreignKeyName: "canvas_capabilities_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      canvas_connections: {
        Row: {
          id: string;
          user_id: string;
          base_url: string;
          canvas_user_id: string;
          canvas_user_name: string;
          canvas_user_email: string | null;
          token_ciphertext: string;
          token_iv: string;
          token_auth_tag: string;
          encryption_version: string;
          status: string;
          last_verified_at: string;
          last_error_code: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          base_url: string;
          canvas_user_id: string;
          canvas_user_name: string;
          canvas_user_email?: string | null;
          token_ciphertext: string;
          token_iv: string;
          token_auth_tag: string;
          encryption_version: string;
          status?: string;
          last_verified_at: string;
          last_error_code?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          base_url?: string;
          canvas_user_id?: string;
          canvas_user_name?: string;
          canvas_user_email?: string | null;
          token_ciphertext?: string;
          token_iv?: string;
          token_auth_tag?: string;
          encryption_version?: string;
          status?: string;
          last_verified_at?: string;
          last_error_code?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "canvas_connections_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: true;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      canvas_courses: {
        Row: {
          id: string;
          user_id: string;
          canvas_connection_id: string;
          canvas_course_id: string;
          name: string;
          course_code: string | null;
          workflow_state: string | null;
          enrollment_term_id: string | null;
          account_id: string | null;
          start_at: string | null;
          end_at: string | null;
          time_zone: string | null;
          public_syllabus: boolean | null;
          syllabus_body: string | null;
          canvas_updated_at: string | null;
          first_synced_at: string;
          last_synced_at: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          canvas_connection_id: string;
          canvas_course_id: string;
          name: string;
          course_code?: string | null;
          workflow_state?: string | null;
          enrollment_term_id?: string | null;
          account_id?: string | null;
          start_at?: string | null;
          end_at?: string | null;
          time_zone?: string | null;
          public_syllabus?: boolean | null;
          syllabus_body?: string | null;
          canvas_updated_at?: string | null;
          first_synced_at?: string;
          last_synced_at?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          canvas_connection_id?: string;
          canvas_course_id?: string;
          name?: string;
          course_code?: string | null;
          workflow_state?: string | null;
          enrollment_term_id?: string | null;
          account_id?: string | null;
          start_at?: string | null;
          end_at?: string | null;
          time_zone?: string | null;
          public_syllabus?: boolean | null;
          syllabus_body?: string | null;
          canvas_updated_at?: string | null;
          first_synced_at?: string;
          last_synced_at?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "canvas_courses_connection_user_fkey";
            columns: ["canvas_connection_id", "user_id"];
            isOneToOne: false;
            referencedRelation: "canvas_connections";
            referencedColumns: ["id", "user_id"];
          },
          {
            foreignKeyName: "canvas_courses_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      canvas_modules: {
        Row: {
          id: string;
          user_id: string;
          canvas_connection_id: string;
          course_id: string;
          canvas_module_id: string;
          name: string;
          position: number | null;
          unlock_at: string | null;
          item_count: number | null;
          require_sequential_progress: boolean | null;
          published: boolean | null;
          prerequisite_module_ids: string[];
          canvas_state: string | null;
          first_synced_at: string;
          last_synced_at: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          canvas_connection_id: string;
          course_id: string;
          canvas_module_id: string;
          name: string;
          position?: number | null;
          unlock_at?: string | null;
          item_count?: number | null;
          require_sequential_progress?: boolean | null;
          published?: boolean | null;
          prerequisite_module_ids?: string[];
          canvas_state?: string | null;
          first_synced_at?: string;
          last_synced_at?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          canvas_connection_id?: string;
          course_id?: string;
          canvas_module_id?: string;
          name?: string;
          position?: number | null;
          unlock_at?: string | null;
          item_count?: number | null;
          require_sequential_progress?: boolean | null;
          published?: boolean | null;
          prerequisite_module_ids?: string[];
          canvas_state?: string | null;
          first_synced_at?: string;
          last_synced_at?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "canvas_modules_course_owner_fkey";
            columns: ["course_id", "user_id", "canvas_connection_id"];
            isOneToOne: false;
            referencedRelation: "canvas_courses";
            referencedColumns: ["id", "user_id", "canvas_connection_id"];
          },
          {
            foreignKeyName: "canvas_modules_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      canvas_module_items: {
        Row: {
          id: string;
          user_id: string;
          canvas_connection_id: string;
          course_id: string;
          module_id: string;
          canvas_module_item_id: string;
          title: string;
          position: number | null;
          indent: number | null;
          item_type: string;
          canvas_content_id: string | null;
          page_url: string | null;
          external_url: string | null;
          html_url: string | null;
          new_tab: boolean | null;
          published: boolean | null;
          completion_requirement: Json | null;
          content_details: Json | null;
          first_synced_at: string;
          last_synced_at: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          canvas_connection_id: string;
          course_id: string;
          module_id: string;
          canvas_module_item_id: string;
          title: string;
          position?: number | null;
          indent?: number | null;
          item_type: string;
          canvas_content_id?: string | null;
          page_url?: string | null;
          external_url?: string | null;
          html_url?: string | null;
          new_tab?: boolean | null;
          published?: boolean | null;
          completion_requirement?: Json | null;
          content_details?: Json | null;
          first_synced_at?: string;
          last_synced_at?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          canvas_connection_id?: string;
          course_id?: string;
          module_id?: string;
          canvas_module_item_id?: string;
          title?: string;
          position?: number | null;
          indent?: number | null;
          item_type?: string;
          canvas_content_id?: string | null;
          page_url?: string | null;
          external_url?: string | null;
          html_url?: string | null;
          new_tab?: boolean | null;
          published?: boolean | null;
          completion_requirement?: Json | null;
          content_details?: Json | null;
          first_synced_at?: string;
          last_synced_at?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "canvas_module_items_module_owner_fkey";
            columns: ["module_id", "user_id", "canvas_connection_id", "course_id"];
            isOneToOne: false;
            referencedRelation: "canvas_modules";
            referencedColumns: [
              "id",
              "user_id",
              "canvas_connection_id",
              "course_id",
            ];
          },
          {
            foreignKeyName: "canvas_module_items_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      canvas_pages: {
        Row: {
          id: string;
          user_id: string;
          canvas_connection_id: string;
          course_id: string;
          canvas_page_id: string | null;
          canvas_page_url: string;
          title: string;
          body_html: string | null;
          published: boolean | null;
          front_page: boolean | null;
          editing_roles: string | null;
          lock_info: Json | null;
          unlock_at: string | null;
          lock_at: string | null;
          canvas_created_at: string | null;
          canvas_updated_at: string | null;
          first_synced_at: string;
          last_synced_at: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          canvas_connection_id: string;
          course_id: string;
          canvas_page_id?: string | null;
          canvas_page_url: string;
          title: string;
          body_html?: string | null;
          published?: boolean | null;
          front_page?: boolean | null;
          editing_roles?: string | null;
          lock_info?: Json | null;
          unlock_at?: string | null;
          lock_at?: string | null;
          canvas_created_at?: string | null;
          canvas_updated_at?: string | null;
          first_synced_at?: string;
          last_synced_at?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          canvas_connection_id?: string;
          course_id?: string;
          canvas_page_id?: string | null;
          canvas_page_url?: string;
          title?: string;
          body_html?: string | null;
          published?: boolean | null;
          front_page?: boolean | null;
          editing_roles?: string | null;
          lock_info?: Json | null;
          unlock_at?: string | null;
          lock_at?: string | null;
          canvas_created_at?: string | null;
          canvas_updated_at?: string | null;
          first_synced_at?: string;
          last_synced_at?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "canvas_pages_course_owner_fkey";
            columns: ["course_id", "user_id", "canvas_connection_id"];
            isOneToOne: false;
            referencedRelation: "canvas_courses";
            referencedColumns: ["id", "user_id", "canvas_connection_id"];
          },
          {
            foreignKeyName: "canvas_pages_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      canvas_assignment_groups: {
        Row: {
          id: string;
          user_id: string;
          canvas_connection_id: string;
          course_id: string;
          canvas_assignment_group_id: string;
          name: string;
          position: number | null;
          group_weight: number | null;
          rules: Json | null;
          integration_data: Json | null;
          first_synced_at: string;
          last_synced_at: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          canvas_connection_id: string;
          course_id: string;
          canvas_assignment_group_id: string;
          name: string;
          position?: number | null;
          group_weight?: number | null;
          rules?: Json | null;
          integration_data?: Json | null;
          first_synced_at?: string;
          last_synced_at?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          canvas_connection_id?: string;
          course_id?: string;
          canvas_assignment_group_id?: string;
          name?: string;
          position?: number | null;
          group_weight?: number | null;
          rules?: Json | null;
          integration_data?: Json | null;
          first_synced_at?: string;
          last_synced_at?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "canvas_assignment_groups_course_owner_fkey";
            columns: ["course_id", "user_id", "canvas_connection_id"];
            isOneToOne: false;
            referencedRelation: "canvas_courses";
            referencedColumns: ["id", "user_id", "canvas_connection_id"];
          },
          {
            foreignKeyName: "canvas_assignment_groups_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      canvas_assignments: {
        Row: {
          id: string;
          user_id: string;
          canvas_connection_id: string;
          course_id: string;
          assignment_group_id: string | null;
          canvas_assignment_id: string;
          canvas_assignment_group_id: string | null;
          name: string;
          description_html: string | null;
          position: number | null;
          points_possible: number | null;
          grading_type: string | null;
          submission_types: string[];
          due_at: string | null;
          unlock_at: string | null;
          lock_at: string | null;
          published: boolean | null;
          muted: boolean | null;
          omit_from_final_grade: boolean | null;
          anonymous_grading: boolean | null;
          html_url: string | null;
          quiz_id: string | null;
          discussion_topic_id: string | null;
          canvas_created_at: string | null;
          canvas_updated_at: string | null;
          first_synced_at: string;
          last_synced_at: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          canvas_connection_id: string;
          course_id: string;
          assignment_group_id?: string | null;
          canvas_assignment_id: string;
          canvas_assignment_group_id?: string | null;
          name: string;
          description_html?: string | null;
          position?: number | null;
          points_possible?: number | null;
          grading_type?: string | null;
          submission_types?: string[];
          due_at?: string | null;
          unlock_at?: string | null;
          lock_at?: string | null;
          published?: boolean | null;
          muted?: boolean | null;
          omit_from_final_grade?: boolean | null;
          anonymous_grading?: boolean | null;
          html_url?: string | null;
          quiz_id?: string | null;
          discussion_topic_id?: string | null;
          canvas_created_at?: string | null;
          canvas_updated_at?: string | null;
          first_synced_at?: string;
          last_synced_at?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          canvas_connection_id?: string;
          course_id?: string;
          assignment_group_id?: string | null;
          canvas_assignment_id?: string;
          canvas_assignment_group_id?: string | null;
          name?: string;
          description_html?: string | null;
          position?: number | null;
          points_possible?: number | null;
          grading_type?: string | null;
          submission_types?: string[];
          due_at?: string | null;
          unlock_at?: string | null;
          lock_at?: string | null;
          published?: boolean | null;
          muted?: boolean | null;
          omit_from_final_grade?: boolean | null;
          anonymous_grading?: boolean | null;
          html_url?: string | null;
          quiz_id?: string | null;
          discussion_topic_id?: string | null;
          canvas_created_at?: string | null;
          canvas_updated_at?: string | null;
          first_synced_at?: string;
          last_synced_at?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "canvas_assignments_assignment_group_id_fkey";
            columns: ["assignment_group_id"];
            isOneToOne: false;
            referencedRelation: "canvas_assignment_groups";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "canvas_assignments_assignment_group_owner_fkey";
            columns: [
              "assignment_group_id",
              "user_id",
              "canvas_connection_id",
              "course_id",
            ];
            isOneToOne: false;
            referencedRelation: "canvas_assignment_groups";
            referencedColumns: [
              "id",
              "user_id",
              "canvas_connection_id",
              "course_id",
            ];
          },
          {
            foreignKeyName: "canvas_assignments_course_owner_fkey";
            columns: ["course_id", "user_id", "canvas_connection_id"];
            isOneToOne: false;
            referencedRelation: "canvas_courses";
            referencedColumns: ["id", "user_id", "canvas_connection_id"];
          },
          {
            foreignKeyName: "canvas_assignments_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      reviewers: {
        Row: {
          id: string;
          user_id: string;
          title: string;
          source_metadata: Json;
          reviewer_output: Json;
          section_count: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          title: string;
          source_metadata?: Json;
          reviewer_output: Json;
          section_count: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          title?: string;
          source_metadata?: Json;
          reviewer_output?: Json;
          section_count?: number;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "reviewers_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: Record<string, never>;
    Functions: {
      replace_canvas_connection_with_capabilities: {
        Args: {
          p_user_id: string;
          p_base_url: string;
          p_canvas_user_id: string;
          p_canvas_user_name: string;
          p_canvas_user_email: string | null;
          p_token_ciphertext: string;
          p_token_iv: string;
          p_token_auth_tag: string;
          p_encryption_version: string;
          p_last_verified_at: string;
          p_capabilities: Json;
        };
        Returns: Array<{
          id: string;
          user_id: string;
          base_url: string;
          canvas_user_id: string;
          canvas_user_name: string;
          canvas_user_email: string | null;
          status: string;
          last_verified_at: string;
          last_error_code: string | null;
          created_at: string;
          updated_at: string;
        }>;
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}
