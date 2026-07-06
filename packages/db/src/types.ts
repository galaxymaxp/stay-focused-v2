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
export type CanvasSyncMode = "full" | "incremental";
export type CanvasSyncRunStatus =
  | "running"
  | "succeeded"
  | "partial"
  | "failed";
export type CanvasSyncCourseResultStatus = "succeeded" | "unchanged" | "failed";
export type CanvasSyncCourseFailureOperation =
  | "modules"
  | "module_items"
  | "pages"
  | "page_detail"
  | "assignment_groups"
  | "assignments"
  | "response_parsing"
  | "persistence"
  | "unknown";
export type CanvasSyncCourseFailureCategory =
  | "authentication_failure"
  | "permission_denied"
  | "resource_not_found"
  | "rate_limited"
  | "server_error"
  | "network_error"
  | "timeout"
  | "malformed_response"
  | "pagination_rejected"
  | "redirect_rejected"
  | "persistence_failure"
  | "normalization_failure"
  | "unknown";
export type CanvasSyncHttpStatusClass =
  | "none"
  | "1xx"
  | "2xx"
  | "3xx"
  | "4xx"
  | "5xx";
export type CanvasSyncRunRow =
  Database["public"]["Tables"]["canvas_sync_runs"]["Row"];
export type CanvasSyncRunInsert =
  Database["public"]["Tables"]["canvas_sync_runs"]["Insert"];
export type CanvasSyncRunUpdate =
  Database["public"]["Tables"]["canvas_sync_runs"]["Update"];
export type CanvasSyncCourseResultRow =
  Database["public"]["Tables"]["canvas_sync_course_results"]["Row"];
export type CanvasSyncCourseResultInsert =
  Database["public"]["Tables"]["canvas_sync_course_results"]["Insert"];
export type CanvasSyncCourseResultUpdate =
  Database["public"]["Tables"]["canvas_sync_course_results"]["Update"];
export type CanvasCourseSyncStateRow =
  Database["public"]["Tables"]["canvas_course_sync_states"]["Row"];
export type CanvasCourseSyncStateInsert =
  Database["public"]["Tables"]["canvas_course_sync_states"]["Insert"];
export type CanvasCourseSyncStateUpdate =
  Database["public"]["Tables"]["canvas_course_sync_states"]["Update"];
export type CanvasPlannerItemRow =
  Database["public"]["Tables"]["canvas_planner_items"]["Row"];
export type CanvasPlannerItemInsert =
  Database["public"]["Tables"]["canvas_planner_items"]["Insert"];
export type CanvasPlannerItemUpdate =
  Database["public"]["Tables"]["canvas_planner_items"]["Update"];
export type CanvasAnnouncementRow =
  Database["public"]["Tables"]["canvas_announcements"]["Row"];
export type CanvasAnnouncementInsert =
  Database["public"]["Tables"]["canvas_announcements"]["Insert"];
export type CanvasAnnouncementUpdate =
  Database["public"]["Tables"]["canvas_announcements"]["Update"];
export type CanvasCourseAcademicSnapshotResult =
  Database["public"]["Functions"]["replace_canvas_course_academic_snapshot"]["Returns"][number];
export type CanvasCourseAcademicSnapshotWithSyncStateResult =
  Database["public"]["Functions"]["replace_canvas_course_academic_snapshot_with_sync_state"]["Returns"][number];
export type CanvasPlannerItemsSnapshotResult =
  Database["public"]["Functions"]["replace_canvas_planner_items_snapshot"]["Returns"][number];
export type CanvasAnnouncementsSnapshotResult =
  Database["public"]["Functions"]["replace_canvas_course_announcements_snapshot"]["Returns"][number];

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
      canvas_sync_runs: {
        Row: {
          id: string;
          user_id: string;
          canvas_connection_id: string;
          sync_mode: CanvasSyncMode;
          status: CanvasSyncRunStatus;
          started_at: string;
          completed_at: string | null;
          heartbeat_at: string;
          discovered_course_count: number;
          successful_course_count: number;
          failed_course_count: number;
          resource_counts: Json;
          failure_code: string | null;
          failure_summary: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          canvas_connection_id: string;
          sync_mode?: CanvasSyncMode;
          status?: CanvasSyncRunStatus;
          started_at?: string;
          completed_at?: string | null;
          heartbeat_at?: string;
          discovered_course_count?: number;
          successful_course_count?: number;
          failed_course_count?: number;
          resource_counts?: Json;
          failure_code?: string | null;
          failure_summary?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          canvas_connection_id?: string;
          sync_mode?: CanvasSyncMode;
          status?: CanvasSyncRunStatus;
          started_at?: string;
          completed_at?: string | null;
          heartbeat_at?: string;
          discovered_course_count?: number;
          successful_course_count?: number;
          failed_course_count?: number;
          resource_counts?: Json;
          failure_code?: string | null;
          failure_summary?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "canvas_sync_runs_connection_user_fkey";
            columns: ["canvas_connection_id", "user_id"];
            isOneToOne: false;
            referencedRelation: "canvas_connections";
            referencedColumns: ["id", "user_id"];
          },
          {
            foreignKeyName: "canvas_sync_runs_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      canvas_sync_course_results: {
        Row: {
          id: string;
          sync_run_id: string;
          user_id: string;
          canvas_connection_id: string;
          course_fingerprint: string;
          status: CanvasSyncCourseResultStatus;
          failure_code: string | null;
          failed_operation: CanvasSyncCourseFailureOperation | null;
          failure_category: CanvasSyncCourseFailureCategory | null;
          http_status_class: CanvasSyncHttpStatusClass | null;
          retryable: boolean | null;
          retry_count: number;
          duration_ms: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          sync_run_id: string;
          user_id: string;
          canvas_connection_id: string;
          course_fingerprint: string;
          status: CanvasSyncCourseResultStatus;
          failure_code?: string | null;
          failed_operation?: CanvasSyncCourseFailureOperation | null;
          failure_category?: CanvasSyncCourseFailureCategory | null;
          http_status_class?: CanvasSyncHttpStatusClass | null;
          retryable?: boolean | null;
          retry_count?: number;
          duration_ms?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          sync_run_id?: string;
          user_id?: string;
          canvas_connection_id?: string;
          course_fingerprint?: string;
          status?: CanvasSyncCourseResultStatus;
          failure_code?: string | null;
          failed_operation?: CanvasSyncCourseFailureOperation | null;
          failure_category?: CanvasSyncCourseFailureCategory | null;
          http_status_class?: CanvasSyncHttpStatusClass | null;
          retryable?: boolean | null;
          retry_count?: number;
          duration_ms?: number;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "canvas_sync_course_results_connection_user_fkey";
            columns: ["canvas_connection_id", "user_id"];
            isOneToOne: false;
            referencedRelation: "canvas_connections";
            referencedColumns: ["id", "user_id"];
          },
          {
            foreignKeyName: "canvas_sync_course_results_sync_run_id_fkey";
            columns: ["sync_run_id"];
            isOneToOne: false;
            referencedRelation: "canvas_sync_runs";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "canvas_sync_course_results_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      canvas_course_sync_states: {
        Row: {
          id: string;
          user_id: string;
          canvas_connection_id: string;
          canvas_course_id: string;
          course_id: string | null;
          snapshot_fingerprint: string | null;
          fingerprint_version: string | null;
          last_checked_at: string;
          last_changed_at: string | null;
          last_successful_sync_at: string | null;
          consecutive_failure_count: number;
          last_failure_code: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          canvas_connection_id: string;
          canvas_course_id: string;
          course_id?: string | null;
          snapshot_fingerprint?: string | null;
          fingerprint_version?: string | null;
          last_checked_at?: string;
          last_changed_at?: string | null;
          last_successful_sync_at?: string | null;
          consecutive_failure_count?: number;
          last_failure_code?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          canvas_connection_id?: string;
          canvas_course_id?: string;
          course_id?: string | null;
          snapshot_fingerprint?: string | null;
          fingerprint_version?: string | null;
          last_checked_at?: string;
          last_changed_at?: string | null;
          last_successful_sync_at?: string | null;
          consecutive_failure_count?: number;
          last_failure_code?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "canvas_course_sync_states_connection_user_fkey";
            columns: ["canvas_connection_id", "user_id"];
            isOneToOne: false;
            referencedRelation: "canvas_connections";
            referencedColumns: ["id", "user_id"];
          },
          {
            foreignKeyName: "canvas_course_sync_states_course_owner_fkey";
            columns: [
              "course_id",
              "user_id",
              "canvas_connection_id",
              "canvas_course_id",
            ];
            isOneToOne: false;
            referencedRelation: "canvas_courses";
            referencedColumns: [
              "id",
              "user_id",
              "canvas_connection_id",
              "canvas_course_id",
            ];
          },
          {
            foreignKeyName: "canvas_course_sync_states_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      canvas_planner_items: {
        Row: {
          id: string;
          user_id: string;
          canvas_connection_id: string;
          course_id: string | null;
          canvas_course_id: string | null;
          canvas_planner_item_id: string;
          context_code: string | null;
          plannable_type: string;
          plannable_id: string;
          title: string | null;
          planner_date: string | null;
          due_at: string | null;
          todo_date: string | null;
          html_url: string | null;
          workflow_state: string | null;
          marked_complete: boolean | null;
          dismissed: boolean | null;
          submission_excused: boolean | null;
          submission_graded: boolean | null;
          submission_late: boolean | null;
          submission_missing: boolean | null;
          submission_needs_grading: boolean | null;
          submission_with_feedback: boolean | null;
          source_fingerprint: string;
          first_synced_at: string;
          last_synced_at: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          canvas_connection_id: string;
          course_id?: string | null;
          canvas_course_id?: string | null;
          canvas_planner_item_id: string;
          context_code?: string | null;
          plannable_type: string;
          plannable_id: string;
          title?: string | null;
          planner_date?: string | null;
          due_at?: string | null;
          todo_date?: string | null;
          html_url?: string | null;
          workflow_state?: string | null;
          marked_complete?: boolean | null;
          dismissed?: boolean | null;
          submission_excused?: boolean | null;
          submission_graded?: boolean | null;
          submission_late?: boolean | null;
          submission_missing?: boolean | null;
          submission_needs_grading?: boolean | null;
          submission_with_feedback?: boolean | null;
          source_fingerprint: string;
          first_synced_at?: string;
          last_synced_at?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          canvas_connection_id?: string;
          course_id?: string | null;
          canvas_course_id?: string | null;
          canvas_planner_item_id?: string;
          context_code?: string | null;
          plannable_type?: string;
          plannable_id?: string;
          title?: string | null;
          planner_date?: string | null;
          due_at?: string | null;
          todo_date?: string | null;
          html_url?: string | null;
          workflow_state?: string | null;
          marked_complete?: boolean | null;
          dismissed?: boolean | null;
          submission_excused?: boolean | null;
          submission_graded?: boolean | null;
          submission_late?: boolean | null;
          submission_missing?: boolean | null;
          submission_needs_grading?: boolean | null;
          submission_with_feedback?: boolean | null;
          source_fingerprint?: string;
          first_synced_at?: string;
          last_synced_at?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "canvas_planner_items_connection_user_fkey";
            columns: ["canvas_connection_id", "user_id"];
            isOneToOne: false;
            referencedRelation: "canvas_connections";
            referencedColumns: ["id", "user_id"];
          },
          {
            foreignKeyName: "canvas_planner_items_course_owner_fkey";
            columns: [
              "course_id",
              "user_id",
              "canvas_connection_id",
              "canvas_course_id",
            ];
            isOneToOne: false;
            referencedRelation: "canvas_courses";
            referencedColumns: [
              "id",
              "user_id",
              "canvas_connection_id",
              "canvas_course_id",
            ];
          },
          {
            foreignKeyName: "canvas_planner_items_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      canvas_announcements: {
        Row: {
          id: string;
          user_id: string;
          canvas_connection_id: string;
          course_id: string;
          canvas_course_id: string;
          canvas_announcement_id: string;
          title: string;
          message_html: string | null;
          posted_at: string | null;
          delayed_post_at: string | null;
          lock_at: string | null;
          todo_date: string | null;
          workflow_state: string | null;
          published: boolean | null;
          locked: boolean | null;
          html_url: string | null;
          source_fingerprint: string;
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
          canvas_course_id: string;
          canvas_announcement_id: string;
          title: string;
          message_html?: string | null;
          posted_at?: string | null;
          delayed_post_at?: string | null;
          lock_at?: string | null;
          todo_date?: string | null;
          workflow_state?: string | null;
          published?: boolean | null;
          locked?: boolean | null;
          html_url?: string | null;
          source_fingerprint: string;
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
          canvas_course_id?: string;
          canvas_announcement_id?: string;
          title?: string;
          message_html?: string | null;
          posted_at?: string | null;
          delayed_post_at?: string | null;
          lock_at?: string | null;
          todo_date?: string | null;
          workflow_state?: string | null;
          published?: boolean | null;
          locked?: boolean | null;
          html_url?: string | null;
          source_fingerprint?: string;
          first_synced_at?: string;
          last_synced_at?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "canvas_announcements_connection_user_fkey";
            columns: ["canvas_connection_id", "user_id"];
            isOneToOne: false;
            referencedRelation: "canvas_connections";
            referencedColumns: ["id", "user_id"];
          },
          {
            foreignKeyName: "canvas_announcements_course_owner_fkey";
            columns: [
              "course_id",
              "user_id",
              "canvas_connection_id",
              "canvas_course_id",
            ];
            isOneToOne: false;
            referencedRelation: "canvas_courses";
            referencedColumns: [
              "id",
              "user_id",
              "canvas_connection_id",
              "canvas_course_id",
            ];
          },
          {
            foreignKeyName: "canvas_announcements_user_id_fkey";
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
      begin_canvas_sync_run: {
        Args: {
          p_user_id: string;
          p_canvas_connection_id: string;
          p_started_at: string;
        };
        Returns: Array<{
          id: string;
          user_id: string;
          canvas_connection_id: string;
          sync_mode: CanvasSyncMode;
          status: CanvasSyncRunStatus;
          started_at: string;
          completed_at: string | null;
          heartbeat_at: string;
          discovered_course_count: number;
          successful_course_count: number;
          failed_course_count: number;
          resource_counts: Json;
          failure_code: string | null;
          failure_summary: string | null;
          created_at: string;
          updated_at: string;
        }>;
      };
      begin_canvas_sync_run_with_mode: {
        Args: {
          p_user_id: string;
          p_canvas_connection_id: string;
          p_sync_mode: CanvasSyncMode;
          p_started_at: string;
        };
        Returns: Array<{
          id: string;
          user_id: string;
          canvas_connection_id: string;
          sync_mode: CanvasSyncMode;
          status: CanvasSyncRunStatus;
          started_at: string;
          completed_at: string | null;
          heartbeat_at: string;
          discovered_course_count: number;
          successful_course_count: number;
          failed_course_count: number;
          resource_counts: Json;
          failure_code: string | null;
          failure_summary: string | null;
          created_at: string;
          updated_at: string;
        }>;
      };
      finish_canvas_sync_run: {
        Args: {
          p_user_id: string;
          p_canvas_connection_id: string;
          p_sync_run_id: string;
          p_status: CanvasSyncRunStatus;
          p_discovered_course_count: number;
          p_successful_course_count: number;
          p_failed_course_count: number;
          p_resource_counts: Json;
          p_failure_code: string | null;
          p_failure_summary: string | null;
          p_completed_at: string;
        };
        Returns: Array<{
          id: string;
          user_id: string;
          canvas_connection_id: string;
          sync_mode: CanvasSyncMode;
          status: CanvasSyncRunStatus;
          started_at: string;
          completed_at: string | null;
          heartbeat_at: string;
          discovered_course_count: number;
          successful_course_count: number;
          failed_course_count: number;
          resource_counts: Json;
          failure_code: string | null;
          failure_summary: string | null;
          created_at: string;
          updated_at: string;
        }>;
      };
      record_canvas_sync_course_result: {
        Args: {
          p_user_id: string;
          p_canvas_connection_id: string;
          p_sync_run_id: string;
          p_course_fingerprint: string;
          p_status: CanvasSyncCourseResultStatus;
          p_failure_code: string | null;
          p_failed_operation: CanvasSyncCourseFailureOperation | null;
          p_failure_category: CanvasSyncCourseFailureCategory | null;
          p_http_status_class: CanvasSyncHttpStatusClass | null;
          p_retryable: boolean | null;
          p_retry_count: number;
          p_duration_ms: number;
        };
        Returns: Array<{
          id: string;
          sync_run_id: string;
          user_id: string;
          canvas_connection_id: string;
          course_fingerprint: string;
          status: CanvasSyncCourseResultStatus;
          failure_code: string | null;
          failed_operation: CanvasSyncCourseFailureOperation | null;
          failure_category: CanvasSyncCourseFailureCategory | null;
          http_status_class: CanvasSyncHttpStatusClass | null;
          retryable: boolean | null;
          retry_count: number;
          duration_ms: number;
          created_at: string;
          updated_at: string;
        }>;
      };
      record_canvas_course_snapshot_failed: {
        Args: {
          p_user_id: string;
          p_canvas_connection_id: string;
          p_sync_run_id: string;
          p_canvas_course_id: string;
          p_checked_at: string;
          p_failure_code: string;
        };
        Returns: Array<{
          sync_state_id: string;
          sync_state_last_checked_at: string;
          sync_state_consecutive_failure_count: number;
          sync_state_last_failure_code: string | null;
        }>;
      };
      record_canvas_course_snapshot_unchanged: {
        Args: {
          p_user_id: string;
          p_canvas_connection_id: string;
          p_sync_run_id: string;
          p_canvas_course_id: string;
          p_checked_at: string;
          p_snapshot_fingerprint: string;
          p_fingerprint_version: string;
        };
        Returns: Array<{
          sync_state_id: string;
          sync_state_last_checked_at: string;
          sync_state_last_changed_at: string | null;
          sync_state_consecutive_failure_count: number;
        }>;
      };
      replace_canvas_course_academic_snapshot: {
        Args: {
          p_user_id: string;
          p_canvas_connection_id: string;
          p_sync_run_id: string;
          p_synced_at: string;
          p_course: Json;
          p_modules: Json;
          p_module_items: Json;
          p_pages: Json;
          p_assignment_groups: Json;
          p_assignments: Json;
        };
        Returns: Array<{
          course_inserted: number;
          course_updated: number;
          modules_inserted: number;
          modules_updated: number;
          modules_deleted: number;
          module_items_inserted: number;
          module_items_updated: number;
          module_items_deleted: number;
          pages_inserted: number;
          pages_updated: number;
          pages_deleted: number;
          assignment_groups_inserted: number;
          assignment_groups_updated: number;
          assignment_groups_deleted: number;
          assignments_inserted: number;
          assignments_updated: number;
          assignments_deleted: number;
        }>;
      };
      replace_canvas_course_academic_snapshot_with_sync_state: {
        Args: {
          p_user_id: string;
          p_canvas_connection_id: string;
          p_sync_run_id: string;
          p_synced_at: string;
          p_course: Json;
          p_modules: Json;
          p_module_items: Json;
          p_pages: Json;
          p_assignment_groups: Json;
          p_assignments: Json;
          p_snapshot_fingerprint: string;
          p_fingerprint_version: string;
        };
        Returns: Array<{
          course_inserted: number;
          course_updated: number;
          modules_inserted: number;
          modules_updated: number;
          modules_deleted: number;
          module_items_inserted: number;
          module_items_updated: number;
          module_items_deleted: number;
          pages_inserted: number;
          pages_updated: number;
          pages_deleted: number;
          assignment_groups_inserted: number;
          assignment_groups_updated: number;
          assignment_groups_deleted: number;
          assignments_inserted: number;
          assignments_updated: number;
          assignments_deleted: number;
          sync_state_id: string;
          sync_state_last_checked_at: string;
          sync_state_last_changed_at: string | null;
          sync_state_consecutive_failure_count: number;
        }>;
      };
      replace_canvas_planner_items_snapshot: {
        Args: {
          p_user_id: string;
          p_canvas_connection_id: string;
          p_sync_run_id: string;
          p_synced_at: string;
          p_window_start_at: string;
          p_window_end_at: string;
          p_context_codes: string[];
          p_items: Json;
        };
        Returns: Array<{
          planner_items_inserted: number;
          planner_items_updated: number;
          planner_items_unchanged: number;
          planner_items_pruned: number;
        }>;
      };
      replace_canvas_course_announcements_snapshot: {
        Args: {
          p_user_id: string;
          p_canvas_connection_id: string;
          p_sync_run_id: string;
          p_synced_at: string;
          p_window_start_at: string;
          p_window_end_at: string;
          p_canvas_course_id: string;
          p_announcements: Json;
        };
        Returns: Array<{
          announcements_inserted: number;
          announcements_updated: number;
          announcements_unchanged: number;
          announcements_pruned: number;
        }>;
      };
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
      update_canvas_sync_run_progress: {
        Args: {
          p_user_id: string;
          p_canvas_connection_id: string;
          p_sync_run_id: string;
          p_discovered_course_count: number;
          p_successful_course_count: number;
          p_failed_course_count: number;
          p_resource_counts: Json;
          p_heartbeat_at: string;
        };
        Returns: Array<{
          id: string;
          user_id: string;
          canvas_connection_id: string;
          sync_mode: CanvasSyncMode;
          status: CanvasSyncRunStatus;
          started_at: string;
          completed_at: string | null;
          heartbeat_at: string;
          discovered_course_count: number;
          successful_course_count: number;
          failed_course_count: number;
          resource_counts: Json;
          failure_code: string | null;
          failure_summary: string | null;
          created_at: string;
          updated_at: string;
        }>;
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}
