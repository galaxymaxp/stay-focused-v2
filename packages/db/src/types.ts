export type Json =
  | string
  | number
  | boolean
  | null
  | { readonly [key: string]: Json | undefined }
  | readonly Json[];

export type SavedReviewerSourceMode =
  | "paste"
  | "gallery"
  | "camera"
  | "pdf"
  | "canvas";

export interface SavedReviewerSourceMetadata {
  readonly sourceMode: SavedReviewerSourceMode;
  readonly sourceCharacterCount: number;
  readonly pdfPageCount?: number;
  readonly sourceLabel?: string;
}

export interface SavedReviewerSourceProvenanceSummary {
  readonly sourceSnapshotId: string;
  readonly sourceMode: "canvas";
  readonly sourceTitle: string;
  readonly sourceCount: number;
  readonly selectedBlockCount: number;
  readonly wasEdited: boolean;
  readonly generatedAt: string;
  readonly parserVersions: readonly string[];
  readonly ocrVersions: readonly string[];
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
  readonly sourceProvenance?: SavedReviewerSourceProvenanceSummary;
}

export type TaskDatabaseStatus = "pending" | "completed";
export type TaskDatabasePriority = "low" | "medium" | "high";
export type TaskDatabaseSourceType = "manual" | "canvas";
export type StudySessionDatabaseStatus = "planned" | "completed" | "skipped";

export type ReviewerRow = Database["public"]["Tables"]["reviewers"]["Row"];
export type ReviewerInsert =
  Database["public"]["Tables"]["reviewers"]["Insert"];
export type ReviewerUpdate =
  Database["public"]["Tables"]["reviewers"]["Update"];
export type TaskRow = Database["public"]["Tables"]["tasks"]["Row"];
export type TaskInsert = Database["public"]["Tables"]["tasks"]["Insert"];
export type TaskUpdate = Database["public"]["Tables"]["tasks"]["Update"];
export type StudyPlanRow = Database["public"]["Tables"]["study_plans"]["Row"];
export type StudyPlanInsert = Database["public"]["Tables"]["study_plans"]["Insert"];
export type StudySessionRow =
  Database["public"]["Tables"]["study_sessions"]["Row"];
export type StudySessionInsert =
  Database["public"]["Tables"]["study_sessions"]["Insert"];
export type StudySessionUpdate =
  Database["public"]["Tables"]["study_sessions"]["Update"];
export type CanvasSourcePreviewSessionRow =
  Database["public"]["Tables"]["canvas_source_preview_sessions"]["Row"];
export type CanvasSourcePreviewSessionInsert =
  Database["public"]["Tables"]["canvas_source_preview_sessions"]["Insert"];
export type CanvasSourceStructureSessionRow =
  Database["public"]["Tables"]["canvas_source_structure_sessions"]["Row"];
export type CanvasSourceStructureSessionInsert =
  Database["public"]["Tables"]["canvas_source_structure_sessions"]["Insert"];
export type ReviewerSourceSnapshotRow =
  Database["public"]["Tables"]["reviewer_source_snapshots"]["Row"];
export type ReviewerSourceSnapshotInsert =
  Database["public"]["Tables"]["reviewer_source_snapshots"]["Insert"];
export type ReviewerSourceSnapshotItemRow =
  Database["public"]["Tables"]["reviewer_source_snapshot_items"]["Row"];
export type ReviewerSourceSnapshotItemInsert =
  Database["public"]["Tables"]["reviewer_source_snapshot_items"]["Insert"];
export type ReviewerSourceSnapshotBlockRow =
  Database["public"]["Tables"]["reviewer_source_snapshot_blocks"]["Row"];
export type ReviewerSourceSnapshotBlockInsert =
  Database["public"]["Tables"]["reviewer_source_snapshot_blocks"]["Insert"];
export type ReviewerSourceSnapshotItemRelationshipRow =
  Database["public"]["Tables"]["reviewer_source_snapshot_item_relationships"]["Row"];
export type ReviewerSourceSnapshotItemRelationshipInsert =
  Database["public"]["Tables"]["reviewer_source_snapshot_item_relationships"]["Insert"];
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
export type CanvasAssignmentSubmissionWorkflowState =
  | "submitted"
  | "unsubmitted"
  | "graded"
  | "pending_review";
export type CanvasAssignmentNormalizedStatus =
  | "unknown"
  | "excused"
  | "unavailable"
  | "locked"
  | "missing"
  | "graded_hidden"
  | "graded"
  | "submitted_late"
  | "submitted"
  | "late_unsubmitted"
  | "available"
  | "upcoming"
  | "no_due_date";
export type CanvasGradeVisibilityState =
  | "unknown"
  | "visible"
  | "hidden"
  | "unavailable"
  | "not_applicable";
export type CanvasLatePolicyStatus = "late" | "missing" | "extended" | "none";
export type CanvasCourseGradeSyncStatus =
  | "never_synced"
  | "running"
  | "succeeded"
  | "partial"
  | "failed";
export type CanvasCourseGradeSyncFamilyState =
  | "not_started"
  | "succeeded"
  | "partial"
  | "failed"
  | "skipped";
export type CanvasCourseGradeSyncFailureCategory =
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
  | "partial_sync"
  | "unknown";
export type CanvasAssignmentSubmissionRow =
  Database["public"]["Tables"]["canvas_assignment_submissions"]["Row"];
export type CanvasAssignmentSubmissionInsert =
  Database["public"]["Tables"]["canvas_assignment_submissions"]["Insert"];
export type CanvasAssignmentSubmissionUpdate =
  Database["public"]["Tables"]["canvas_assignment_submissions"]["Update"];
export type CanvasCourseGradeSummaryRow =
  Database["public"]["Tables"]["canvas_course_grade_summaries"]["Row"];
export type CanvasCourseGradeSummaryInsert =
  Database["public"]["Tables"]["canvas_course_grade_summaries"]["Insert"];
export type CanvasCourseGradeSummaryUpdate =
  Database["public"]["Tables"]["canvas_course_grade_summaries"]["Update"];
export type CanvasCourseGradeSyncStateRow =
  Database["public"]["Tables"]["canvas_course_grade_sync_states"]["Row"];
export type CanvasCourseGradeSyncStateInsert =
  Database["public"]["Tables"]["canvas_course_grade_sync_states"]["Insert"];
export type CanvasCourseGradeSyncStateUpdate =
  Database["public"]["Tables"]["canvas_course_grade_sync_states"]["Update"];
export type CanvasSyncMode = "full" | "incremental" | "course";
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
export type CanvasSyncJobType = "course_content" | "course_grades";
export type CanvasSyncJobStatus =
  | "queued"
  | "running"
  | "succeeded"
  | "failed"
  | "cancellation_requested"
  | "cancelled"
  | "expired";
export type CanvasSyncJobStage =
  | "waiting_to_start"
  | "preparing_course"
  | "planning_sync"
  | "fetching_pages"
  | "reading_item_details"
  | "checking_changes"
  | "promoting_scopes"
  | "synchronizing_content"
  | "synchronizing_grades"
  | "storing_result"
  | "complete";
export type CanvasSyncJobOutcome =
  | "success"
  | "unchanged"
  | "partial"
  | "failed"
  | "cancelled";
export type CanvasSyncJobUnitStatus =
  | "queued"
  | "running"
  | "retry_wait"
  | "succeeded"
  | "failed"
  | "cancelled"
  | "skipped";
export type CanvasSyncScope =
  | "content"
  | "announcements"
  | "files"
  | "grades";
export type CanvasSyncScopeHealthStatus =
  | "not_synced"
  | "syncing"
  | "healthy"
  | "partial"
  | "stale"
  | "failed";
export type CanvasSyncItemState =
  | "discovered"
  | "synced"
  | "metadata_only"
  | "locked"
  | "unpublished"
  | "permission_denied"
  | "external"
  | "unsupported_format"
  | "download_failed"
  | "parse_failed"
  | "ocr_failed"
  | "stale"
  | "deleted_from_canvas"
  | "temporarily_failed";
export type CanvasSyncJobDatabaseRow =
  Database["public"]["Tables"]["canvas_sync_jobs"]["Row"];
export type CanvasSyncJobInsert =
  Database["public"]["Tables"]["canvas_sync_jobs"]["Insert"];
export type CanvasSyncJobUpdate =
  Database["public"]["Tables"]["canvas_sync_jobs"]["Update"];
export type CanvasSyncJobUnitRow =
  Database["public"]["Tables"]["canvas_sync_job_units"]["Row"];
export type CanvasSyncJobStagingRow =
  Database["public"]["Tables"]["canvas_sync_job_staging"]["Row"];
export type CanvasCourseSyncScopeStateRow =
  Database["public"]["Tables"]["canvas_course_sync_scope_states"]["Row"];
export type CanvasCourseItemSyncStateRow =
  Database["public"]["Tables"]["canvas_course_item_sync_states"]["Row"];
export type CanvasCourseSyncStateRow =
  Database["public"]["Tables"]["canvas_course_sync_states"]["Row"];
export type CanvasCourseSyncStateInsert =
  Database["public"]["Tables"]["canvas_course_sync_states"]["Insert"];
export type CanvasCourseSyncStateUpdate =
  Database["public"]["Tables"]["canvas_course_sync_states"]["Update"];
export type CanvasCourseSyncPreferenceRow =
  Database["public"]["Tables"]["canvas_course_sync_preferences"]["Row"];
export type CanvasCourseSyncPreferenceInsert =
  Database["public"]["Tables"]["canvas_course_sync_preferences"]["Insert"];
export type CanvasCourseSyncPreferenceUpdate =
  Database["public"]["Tables"]["canvas_course_sync_preferences"]["Update"];
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
export type CanvasFileRow =
  Database["public"]["Tables"]["canvas_files"]["Row"];
export type CanvasFileInsert =
  Database["public"]["Tables"]["canvas_files"]["Insert"];
export type CanvasFileUpdate =
  Database["public"]["Tables"]["canvas_files"]["Update"];
export type CanvasFileReferenceRow =
  Database["public"]["Tables"]["canvas_file_references"]["Row"];
export type CanvasFileReferenceInsert =
  Database["public"]["Tables"]["canvas_file_references"]["Insert"];
export type CanvasFileReferenceUpdate =
  Database["public"]["Tables"]["canvas_file_references"]["Update"];
export type CanvasFileIngestionResultRow =
  Database["public"]["Tables"]["canvas_file_ingestion_results"]["Row"];
export type CanvasFileIngestionResultInsert =
  Database["public"]["Tables"]["canvas_file_ingestion_results"]["Insert"];
export type CanvasFileIngestionResultUpdate =
  Database["public"]["Tables"]["canvas_file_ingestion_results"]["Update"];
export type CanvasCourseAcademicSnapshotResult =
  Database["public"]["Functions"]["replace_canvas_course_academic_snapshot"]["Returns"][number];
export type CanvasCourseAcademicSnapshotWithSyncStateResult =
  Database["public"]["Functions"]["replace_canvas_course_academic_snapshot_with_sync_state"]["Returns"][number];
export type CanvasPlannerItemsSnapshotResult =
  Database["public"]["Functions"]["replace_canvas_planner_items_snapshot"]["Returns"][number];
export type CanvasAnnouncementsSnapshotResult =
  Database["public"]["Functions"]["replace_canvas_course_announcements_snapshot"]["Returns"][number];
export type CanvasFilesInventorySnapshotResult =
  Database["public"]["Functions"]["replace_canvas_course_files_inventory"]["Returns"][number];
export type CanvasCourseSyncPreferencesReplacementResult =
  Database["public"]["Functions"]["replace_canvas_course_sync_preferences"]["Returns"][number];

export type ProcessingJobType =
  | "document_extraction"
  | "reviewer_generation";
export type ProcessingJobStatus =
  | "queued"
  | "running"
  | "succeeded"
  | "failed"
  | "cancellation_requested"
  | "cancelled"
  | "expired";
export type ProcessingJobStage =
  | "accepting_upload"
  | "inspecting_document"
  | "extracting_native_text"
  | "preparing_ocr_chunks"
  | "extracting_ocr"
  | "verifying_pages"
  | "assembling_text"
  | "storing_result"
  | "preparing_source"
  | "normalizing_source"
  | "detecting_outline"
  | "planning_sections"
  | "generating_sections"
  | "verifying_coverage"
  | "retrying_sections"
  | "assembling_reviewer"
  | "storing_reviewer";

export type ProcessingJobDatabaseRow = {
  readonly id: string;
  readonly user_id: string;
  readonly job_type: ProcessingJobType;
  readonly status: ProcessingJobStatus;
  readonly stage: ProcessingJobStage;
  readonly status_message: string;
  readonly completed_units: number | null;
  readonly total_units: number | null;
  readonly unit_label: "pages" | "sections" | null;
  readonly source_metadata: Json;
  readonly metrics: Json;
  readonly source_snapshot_id: string;
  readonly result_id: string | null;
  readonly idempotency_key: string;
  readonly request_fingerprint: string;
  readonly idempotency_expires_at: string;
  readonly retry_of_job_id: string | null;
  readonly created_at: string;
  readonly accepted_at: string;
  readonly started_at: string | null;
  readonly updated_at: string;
  readonly completed_at: string | null;
  readonly failed_at: string | null;
  readonly cancellation_requested_at: string | null;
  readonly expires_at: string;
  readonly error_code: string | null;
  readonly safe_error_message: string | null;
  readonly retryable: boolean;
  readonly attempt_count: number;
  readonly max_attempts: number;
  readonly next_attempt_at: string;
  readonly lease_owner: string | null;
  readonly lease_expires_at: string | null;
  readonly heartbeat_at: string | null;
  readonly execution_backend: "database_worker" | "vercel_workflow";
  readonly workflow_run_id: string | null;
  readonly workflow_dispatched_at: string | null;
  readonly source_version_id: string | null;
  readonly artifact_type:
    | "reviewer"
    | "flashcards"
    | "quiz"
    | "summary"
    | "practice_test"
    | "study_guide"
    | null;
  readonly generation_policy_version: string | null;
  readonly engine_version: string | null;
  readonly schema_version: string | null;
  readonly provider_id: string | null;
  readonly settings_fingerprint: string | null;
  readonly language: string | null;
  readonly output_mode: string | null;
  readonly reuse_mode: "fresh" | "reuse_existing";
  readonly reuse_of_job_id: string | null;
  readonly reuse_candidate_artifact_version_id: string | null;
  readonly scheduled_for: string;
  readonly priority_class: number;
};

export type ProcessingJobRow =
  Database["public"]["Tables"]["processing_jobs"]["Row"];
export type ProcessingJobSourceRow =
  Database["public"]["Tables"]["processing_job_sources"]["Row"];
export type ProcessingJobResultRow =
  Database["public"]["Tables"]["processing_job_results"]["Row"];
export type ProcessingJobCheckpointRow =
  Database["public"]["Tables"]["processing_job_checkpoints"]["Row"];
export type DocumentAssetRow =
  Database["public"]["Tables"]["document_assets"]["Row"];
export type ExtractionResultRow =
  Database["public"]["Tables"]["extraction_results"]["Row"];
export type SourceVersionRow =
  Database["public"]["Tables"]["source_versions"]["Row"];
export type GeneratedArtifactRow =
  Database["public"]["Tables"]["generated_artifacts"]["Row"];
export type GeneratedArtifactVersionRow =
  Database["public"]["Tables"]["generated_artifact_versions"]["Row"];
export type ProcessingUploadIntentRow =
  Database["public"]["Tables"]["processing_upload_intents"]["Row"];
export type PushNotificationDeviceRow =
  Database["public"]["Tables"]["push_notification_devices"]["Row"];
export type ProcessingNotificationDeliveryRow =
  Database["public"]["Tables"]["processing_notification_deliveries"]["Row"];

export interface Database {
  public: {
    Tables: {
      tasks: {
        Row: {
          id: string;
          user_id: string;
          title: string;
          notes: string | null;
          status: TaskDatabaseStatus;
          priority: TaskDatabasePriority;
          due_at: string | null;
          estimated_minutes: number;
          source_type: TaskDatabaseSourceType;
          canvas_connection_id: string | null;
          canvas_course_id: string | null;
          canvas_assignment_id: string | null;
          canvas_assignment_row_id: string | null;
          created_at: string;
          updated_at: string;
          completed_at: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          title: string;
          notes?: string | null;
          status?: TaskDatabaseStatus;
          priority?: TaskDatabasePriority;
          due_at?: string | null;
          estimated_minutes?: number;
          source_type?: TaskDatabaseSourceType;
          canvas_connection_id?: string | null;
          canvas_course_id?: string | null;
          canvas_assignment_id?: string | null;
          canvas_assignment_row_id?: string | null;
          created_at?: string;
          updated_at?: string;
          completed_at?: string | null;
        };
        Update: {
          id?: string;
          user_id?: string;
          title?: string;
          notes?: string | null;
          status?: TaskDatabaseStatus;
          priority?: TaskDatabasePriority;
          due_at?: string | null;
          estimated_minutes?: number;
          source_type?: TaskDatabaseSourceType;
          canvas_connection_id?: string | null;
          canvas_course_id?: string | null;
          canvas_assignment_id?: string | null;
          canvas_assignment_row_id?: string | null;
          created_at?: string;
          updated_at?: string;
          completed_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "tasks_canvas_assignment_row_id_fkey";
            columns: ["canvas_assignment_row_id"];
            isOneToOne: false;
            referencedRelation: "canvas_assignments";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "tasks_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      study_plans: {
        Row: {
          id: string;
          user_id: string;
          planning_starts_at: string;
          planning_ends_at: string;
          algorithm_version: "deterministic-v1";
          input_hash: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          planning_starts_at: string;
          planning_ends_at: string;
          algorithm_version: "deterministic-v1";
          input_hash: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          planning_starts_at?: string;
          planning_ends_at?: string;
          algorithm_version?: "deterministic-v1";
          input_hash?: string;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "study_plans_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      study_sessions: {
        Row: {
          id: string;
          user_id: string;
          study_plan_id: string | null;
          task_id: string;
          starts_at: string;
          ends_at: string;
          status: StudySessionDatabaseStatus;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          study_plan_id?: string | null;
          task_id: string;
          starts_at: string;
          ends_at: string;
          status?: StudySessionDatabaseStatus;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          study_plan_id?: string | null;
          task_id?: string;
          starts_at?: string;
          ends_at?: string;
          status?: StudySessionDatabaseStatus;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "study_sessions_plan_owner_fkey";
            columns: ["study_plan_id", "user_id"];
            isOneToOne: false;
            referencedRelation: "study_plans";
            referencedColumns: ["id", "user_id"];
          },
          {
            foreignKeyName: "study_sessions_task_owner_fkey";
            columns: ["task_id", "user_id"];
            isOneToOne: false;
            referencedRelation: "tasks";
            referencedColumns: ["id", "user_id"];
          },
          {
            foreignKeyName: "study_sessions_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      canvas_source_preview_sessions: {
        Row: {
          id: string;
          user_id: string;
          canvas_connection_id: string;
          course_id: string;
          original_preview_text: string;
          original_preview_sha256: string;
          suggested_title: string;
          source_count: number;
          source_manifest: Json;
          selected_block_manifest: Json;
          source_relationship_manifest: Json;
          duplicate_analysis_version: string | null;
          normalization_version: string;
          created_at: string;
          expires_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          canvas_connection_id: string;
          course_id: string;
          original_preview_text: string;
          original_preview_sha256: string;
          suggested_title: string;
          source_count: number;
          source_manifest: Json;
          selected_block_manifest?: Json;
          source_relationship_manifest?: Json;
          duplicate_analysis_version?: string | null;
          normalization_version: string;
          created_at?: string;
          expires_at: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          canvas_connection_id?: string;
          course_id?: string;
          original_preview_text?: string;
          original_preview_sha256?: string;
          suggested_title?: string;
          source_count?: number;
          source_manifest?: Json;
          selected_block_manifest?: Json;
          source_relationship_manifest?: Json;
          duplicate_analysis_version?: string | null;
          normalization_version?: string;
          created_at?: string;
          expires_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "canvas_source_preview_sessions_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      canvas_source_structure_sessions: {
        Row: {
          id: string;
          user_id: string;
          canvas_connection_id: string;
          course_id: string;
          source_count: number;
          source_manifest: Json;
          block_count: number;
          block_manifest: Json;
          source_relationship_manifest: Json;
          duplicate_analysis_version: string | null;
          structure_version: string;
          created_at: string;
          expires_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          canvas_connection_id: string;
          course_id: string;
          source_count: number;
          source_manifest: Json;
          block_count: number;
          block_manifest: Json;
          source_relationship_manifest?: Json;
          duplicate_analysis_version?: string | null;
          structure_version: string;
          created_at?: string;
          expires_at: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          canvas_connection_id?: string;
          course_id?: string;
          source_count?: number;
          source_manifest?: Json;
          block_count?: number;
          block_manifest?: Json;
          source_relationship_manifest?: Json;
          duplicate_analysis_version?: string | null;
          structure_version?: string;
          created_at?: string;
          expires_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "canvas_source_structure_sessions_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
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
      canvas_assignment_submissions: {
        Row: {
          id: string;
          user_id: string;
          canvas_connection_id: string;
          course_id: string;
          assignment_id: string;
          workflow_state: CanvasAssignmentSubmissionWorkflowState | null;
          normalized_status: CanvasAssignmentNormalizedStatus;
          submitted_at: string | null;
          graded_at: string | null;
          posted_at: string | null;
          attempt: number | null;
          submission_type: string | null;
          grade_matches_current_submission: boolean | null;
          late: boolean | null;
          missing: boolean | null;
          excused: boolean | null;
          assignment_visible: boolean | null;
          late_policy_status: CanvasLatePolicyStatus | null;
          seconds_late: number | null;
          score: number | null;
          grade: string | null;
          score_visibility_state: CanvasGradeVisibilityState;
          grade_visibility_state: CanvasGradeVisibilityState;
          points_possible_at_sync: number | null;
          first_synced_at: string;
          last_synced_at: string;
          last_seen_at: string;
          absent_after_sync_at: string | null;
          source_fingerprint: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          canvas_connection_id: string;
          course_id: string;
          assignment_id: string;
          workflow_state?: CanvasAssignmentSubmissionWorkflowState | null;
          normalized_status?: CanvasAssignmentNormalizedStatus;
          submitted_at?: string | null;
          graded_at?: string | null;
          posted_at?: string | null;
          attempt?: number | null;
          submission_type?: string | null;
          grade_matches_current_submission?: boolean | null;
          late?: boolean | null;
          missing?: boolean | null;
          excused?: boolean | null;
          assignment_visible?: boolean | null;
          late_policy_status?: CanvasLatePolicyStatus | null;
          seconds_late?: number | null;
          score?: number | null;
          grade?: string | null;
          score_visibility_state?: CanvasGradeVisibilityState;
          grade_visibility_state?: CanvasGradeVisibilityState;
          points_possible_at_sync?: number | null;
          first_synced_at?: string;
          last_synced_at?: string;
          last_seen_at?: string;
          absent_after_sync_at?: string | null;
          source_fingerprint: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          canvas_connection_id?: string;
          course_id?: string;
          assignment_id?: string;
          workflow_state?: CanvasAssignmentSubmissionWorkflowState | null;
          normalized_status?: CanvasAssignmentNormalizedStatus;
          submitted_at?: string | null;
          graded_at?: string | null;
          posted_at?: string | null;
          attempt?: number | null;
          submission_type?: string | null;
          grade_matches_current_submission?: boolean | null;
          late?: boolean | null;
          missing?: boolean | null;
          excused?: boolean | null;
          assignment_visible?: boolean | null;
          late_policy_status?: CanvasLatePolicyStatus | null;
          seconds_late?: number | null;
          score?: number | null;
          grade?: string | null;
          score_visibility_state?: CanvasGradeVisibilityState;
          grade_visibility_state?: CanvasGradeVisibilityState;
          points_possible_at_sync?: number | null;
          first_synced_at?: string;
          last_synced_at?: string;
          last_seen_at?: string;
          absent_after_sync_at?: string | null;
          source_fingerprint?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "canvas_assignment_submissions_assignment_owner_fkey";
            columns: [
              "assignment_id",
              "user_id",
              "canvas_connection_id",
              "course_id",
            ];
            isOneToOne: false;
            referencedRelation: "canvas_assignments";
            referencedColumns: [
              "id",
              "user_id",
              "canvas_connection_id",
              "course_id",
            ];
          },
          {
            foreignKeyName: "canvas_assignment_submissions_connection_user_fkey";
            columns: ["canvas_connection_id", "user_id"];
            isOneToOne: false;
            referencedRelation: "canvas_connections";
            referencedColumns: ["id", "user_id"];
          },
          {
            foreignKeyName: "canvas_assignment_submissions_course_owner_fkey";
            columns: ["course_id", "user_id", "canvas_connection_id"];
            isOneToOne: false;
            referencedRelation: "canvas_courses";
            referencedColumns: ["id", "user_id", "canvas_connection_id"];
          },
          {
            foreignKeyName: "canvas_assignment_submissions_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      canvas_course_grade_summaries: {
        Row: {
          id: string;
          user_id: string;
          canvas_connection_id: string;
          course_id: string;
          current_score: number | null;
          current_score_visibility_state: CanvasGradeVisibilityState;
          current_grade: string | null;
          current_grade_visibility_state: CanvasGradeVisibilityState;
          final_score: number | null;
          final_score_visibility_state: CanvasGradeVisibilityState;
          final_grade: string | null;
          final_grade_visibility_state: CanvasGradeVisibilityState;
          first_synced_at: string;
          last_synced_at: string;
          last_seen_at: string;
          source_fingerprint: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          canvas_connection_id: string;
          course_id: string;
          current_score?: number | null;
          current_score_visibility_state?: CanvasGradeVisibilityState;
          current_grade?: string | null;
          current_grade_visibility_state?: CanvasGradeVisibilityState;
          final_score?: number | null;
          final_score_visibility_state?: CanvasGradeVisibilityState;
          final_grade?: string | null;
          final_grade_visibility_state?: CanvasGradeVisibilityState;
          first_synced_at?: string;
          last_synced_at?: string;
          last_seen_at?: string;
          source_fingerprint: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          canvas_connection_id?: string;
          course_id?: string;
          current_score?: number | null;
          current_score_visibility_state?: CanvasGradeVisibilityState;
          current_grade?: string | null;
          current_grade_visibility_state?: CanvasGradeVisibilityState;
          final_score?: number | null;
          final_score_visibility_state?: CanvasGradeVisibilityState;
          final_grade?: string | null;
          final_grade_visibility_state?: CanvasGradeVisibilityState;
          first_synced_at?: string;
          last_synced_at?: string;
          last_seen_at?: string;
          source_fingerprint?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "canvas_course_grade_summaries_connection_user_fkey";
            columns: ["canvas_connection_id", "user_id"];
            isOneToOne: false;
            referencedRelation: "canvas_connections";
            referencedColumns: ["id", "user_id"];
          },
          {
            foreignKeyName: "canvas_course_grade_summaries_course_owner_fkey";
            columns: ["course_id", "user_id", "canvas_connection_id"];
            isOneToOne: false;
            referencedRelation: "canvas_courses";
            referencedColumns: ["id", "user_id", "canvas_connection_id"];
          },
          {
            foreignKeyName: "canvas_course_grade_summaries_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      canvas_course_grade_sync_states: {
        Row: {
          id: string;
          user_id: string;
          canvas_connection_id: string;
          course_id: string;
          sync_status: CanvasCourseGradeSyncStatus;
          last_checked_at: string | null;
          last_completed_at: string | null;
          last_successful_sync_at: string | null;
          last_completed_snapshot_authoritative: boolean;
          consecutive_failure_count: number;
          last_failure_code: string | null;
          last_failure_category: CanvasCourseGradeSyncFailureCategory | null;
          synced_assignment_count: number;
          synced_submission_count: number;
          synced_course_grade_summary_count: number;
          assignment_family_state: CanvasCourseGradeSyncFamilyState;
          submission_family_state: CanvasCourseGradeSyncFamilyState;
          course_grade_summary_family_state: CanvasCourseGradeSyncFamilyState;
          source_fingerprint: string | null;
          fingerprint_version: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          canvas_connection_id: string;
          course_id: string;
          sync_status?: CanvasCourseGradeSyncStatus;
          last_checked_at?: string | null;
          last_completed_at?: string | null;
          last_successful_sync_at?: string | null;
          last_completed_snapshot_authoritative?: boolean;
          consecutive_failure_count?: number;
          last_failure_code?: string | null;
          last_failure_category?: CanvasCourseGradeSyncFailureCategory | null;
          synced_assignment_count?: number;
          synced_submission_count?: number;
          synced_course_grade_summary_count?: number;
          assignment_family_state?: CanvasCourseGradeSyncFamilyState;
          submission_family_state?: CanvasCourseGradeSyncFamilyState;
          course_grade_summary_family_state?: CanvasCourseGradeSyncFamilyState;
          source_fingerprint?: string | null;
          fingerprint_version?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          canvas_connection_id?: string;
          course_id?: string;
          sync_status?: CanvasCourseGradeSyncStatus;
          last_checked_at?: string | null;
          last_completed_at?: string | null;
          last_successful_sync_at?: string | null;
          last_completed_snapshot_authoritative?: boolean;
          consecutive_failure_count?: number;
          last_failure_code?: string | null;
          last_failure_category?: CanvasCourseGradeSyncFailureCategory | null;
          synced_assignment_count?: number;
          synced_submission_count?: number;
          synced_course_grade_summary_count?: number;
          assignment_family_state?: CanvasCourseGradeSyncFamilyState;
          submission_family_state?: CanvasCourseGradeSyncFamilyState;
          course_grade_summary_family_state?: CanvasCourseGradeSyncFamilyState;
          source_fingerprint?: string | null;
          fingerprint_version?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "canvas_course_grade_sync_states_connection_user_fkey";
            columns: ["canvas_connection_id", "user_id"];
            isOneToOne: false;
            referencedRelation: "canvas_connections";
            referencedColumns: ["id", "user_id"];
          },
          {
            foreignKeyName: "canvas_course_grade_sync_states_course_owner_fkey";
            columns: ["course_id", "user_id", "canvas_connection_id"];
            isOneToOne: false;
            referencedRelation: "canvas_courses";
            referencedColumns: ["id", "user_id", "canvas_connection_id"];
          },
          {
            foreignKeyName: "canvas_course_grade_sync_states_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      canvas_sync_jobs: {
        Row: {
          id: string;
          user_id: string;
          canvas_connection_id: string;
          course_id: string;
          job_type: CanvasSyncJobType;
          status: CanvasSyncJobStatus;
          stage: CanvasSyncJobStage;
          status_message: string;
          completed_units: number | null;
          total_units: number | null;
          unit_label: "operations" | null;
          progress_total_known: boolean;
          checkpoint_version: string | null;
          deadline_at: string | null;
          source_metadata: Json;
          result_summary: Json | null;
          result_outcome: CanvasSyncJobOutcome | null;
          idempotency_key: string;
          request_fingerprint: string;
          retry_idempotency_key: string | null;
          idempotency_expires_at: string;
          workflow_run_id: string | null;
          workflow_dispatched_at: string | null;
          worker_id: string | null;
          created_at: string;
          accepted_at: string;
          started_at: string | null;
          updated_at: string;
          completed_at: string | null;
          failed_at: string | null;
          cancellation_requested_at: string | null;
          error_code: string | null;
          safe_error_message: string | null;
          retryable: boolean;
          attempt_count: number;
          max_attempts: number;
          retry_of_job_id: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          canvas_connection_id: string;
          course_id: string;
          job_type: CanvasSyncJobType;
          status?: CanvasSyncJobStatus;
          stage?: CanvasSyncJobStage;
          status_message?: string;
          completed_units?: number | null;
          total_units?: number | null;
          unit_label?: "operations" | null;
          progress_total_known?: boolean;
          checkpoint_version?: string | null;
          deadline_at?: string | null;
          source_metadata?: Json;
          result_summary?: Json | null;
          result_outcome?: CanvasSyncJobOutcome | null;
          idempotency_key: string;
          request_fingerprint: string;
          retry_idempotency_key?: string | null;
          idempotency_expires_at?: string;
          workflow_run_id?: string | null;
          workflow_dispatched_at?: string | null;
          worker_id?: string | null;
          created_at?: string;
          accepted_at?: string;
          started_at?: string | null;
          updated_at?: string;
          completed_at?: string | null;
          failed_at?: string | null;
          cancellation_requested_at?: string | null;
          error_code?: string | null;
          safe_error_message?: string | null;
          retryable?: boolean;
          attempt_count?: number;
          max_attempts?: number;
          retry_of_job_id?: string | null;
        };
        Update: {
          id?: string;
          user_id?: string;
          canvas_connection_id?: string;
          course_id?: string;
          job_type?: CanvasSyncJobType;
          status?: CanvasSyncJobStatus;
          stage?: CanvasSyncJobStage;
          status_message?: string;
          completed_units?: number | null;
          total_units?: number | null;
          unit_label?: "operations" | null;
          progress_total_known?: boolean;
          checkpoint_version?: string | null;
          deadline_at?: string | null;
          source_metadata?: Json;
          result_summary?: Json | null;
          result_outcome?: CanvasSyncJobOutcome | null;
          idempotency_key?: string;
          request_fingerprint?: string;
          retry_idempotency_key?: string | null;
          idempotency_expires_at?: string;
          workflow_run_id?: string | null;
          workflow_dispatched_at?: string | null;
          worker_id?: string | null;
          created_at?: string;
          accepted_at?: string;
          started_at?: string | null;
          updated_at?: string;
          completed_at?: string | null;
          failed_at?: string | null;
          cancellation_requested_at?: string | null;
          error_code?: string | null;
          safe_error_message?: string | null;
          retryable?: boolean;
          attempt_count?: number;
          max_attempts?: number;
          retry_of_job_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "canvas_sync_jobs_connection_owner_fkey";
            columns: ["canvas_connection_id", "user_id"];
            isOneToOne: false;
            referencedRelation: "canvas_connections";
            referencedColumns: ["id", "user_id"];
          },
          {
            foreignKeyName: "canvas_sync_jobs_course_owner_fkey";
            columns: ["course_id", "user_id", "canvas_connection_id"];
            isOneToOne: false;
            referencedRelation: "canvas_courses";
            referencedColumns: ["id", "user_id", "canvas_connection_id"];
          },
          {
            foreignKeyName: "canvas_sync_jobs_retry_parent_fkey";
            columns: ["retry_of_job_id"];
            isOneToOne: false;
            referencedRelation: "canvas_sync_jobs";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "canvas_sync_jobs_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      canvas_sync_job_units: {
        Row: {
          id: string;
          job_id: string;
          user_id: string;
          canvas_connection_id: string;
          course_id: string;
          unit_key: string;
          unit_kind: string;
          scope: CanvasSyncScope;
          status: CanvasSyncJobUnitStatus;
          page_index: number;
          is_discovery: boolean;
          checkpoint: Json;
          attempt_count: number;
          max_attempts: number;
          available_at: string;
          lease_owner: string | null;
          lease_expires_at: string | null;
          safe_error_code: string | null;
          safe_error_message: string | null;
          retryable: boolean;
          started_at: string | null;
          completed_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          job_id: string;
          user_id: string;
          canvas_connection_id: string;
          course_id: string;
          unit_key: string;
          unit_kind: string;
          scope: CanvasSyncScope;
          status?: CanvasSyncJobUnitStatus;
          page_index?: number;
          is_discovery?: boolean;
          checkpoint?: Json;
          attempt_count?: number;
          max_attempts?: number;
          available_at?: string;
          lease_owner?: string | null;
          lease_expires_at?: string | null;
          safe_error_code?: string | null;
          safe_error_message?: string | null;
          retryable?: boolean;
          started_at?: string | null;
          completed_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<
          Database["public"]["Tables"]["canvas_sync_job_units"]["Insert"]
        >;
        Relationships: [
          {
            foreignKeyName: "canvas_sync_job_units_job_owner_fkey";
            columns: ["job_id", "user_id"];
            isOneToOne: false;
            referencedRelation: "canvas_sync_jobs";
            referencedColumns: ["id", "user_id"];
          },
          {
            foreignKeyName: "canvas_sync_job_units_connection_owner_fkey";
            columns: ["canvas_connection_id", "user_id"];
            isOneToOne: false;
            referencedRelation: "canvas_connections";
            referencedColumns: ["id", "user_id"];
          },
          {
            foreignKeyName: "canvas_sync_job_units_course_owner_fkey";
            columns: ["course_id", "user_id", "canvas_connection_id"];
            isOneToOne: false;
            referencedRelation: "canvas_courses";
            referencedColumns: ["id", "user_id", "canvas_connection_id"];
          },
        ];
      };
      canvas_sync_job_staging: {
        Row: {
          id: string;
          job_id: string;
          unit_id: string;
          user_id: string;
          scope: CanvasSyncScope;
          payload_kind: string;
          payload: Json;
          expires_at: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          job_id: string;
          unit_id: string;
          user_id: string;
          scope: CanvasSyncScope;
          payload_kind: string;
          payload: Json;
          expires_at?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<
          Database["public"]["Tables"]["canvas_sync_job_staging"]["Insert"]
        >;
        Relationships: [
          {
            foreignKeyName: "canvas_sync_job_staging_job_owner_fkey";
            columns: ["job_id", "user_id"];
            isOneToOne: false;
            referencedRelation: "canvas_sync_jobs";
            referencedColumns: ["id", "user_id"];
          },
          {
            foreignKeyName: "canvas_sync_job_staging_unit_fkey";
            columns: ["unit_id"];
            isOneToOne: true;
            referencedRelation: "canvas_sync_job_units";
            referencedColumns: ["id"];
          },
        ];
      };
      canvas_course_sync_scope_states: {
        Row: {
          id: string;
          user_id: string;
          canvas_connection_id: string;
          course_id: string;
          scope: CanvasSyncScope;
          health_status: CanvasSyncScopeHealthStatus;
          last_job_id: string | null;
          last_checked_at: string | null;
          last_successful_at: string | null;
          synced_count: number;
          metadata_only_count: number;
          temporarily_failed_count: number;
          stale_count: number;
          deleted_count: number;
          safe_message: string | null;
          safe_error_code: string | null;
          retryable: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          canvas_connection_id: string;
          course_id: string;
          scope: CanvasSyncScope;
          health_status?: CanvasSyncScopeHealthStatus;
          last_job_id?: string | null;
          last_checked_at?: string | null;
          last_successful_at?: string | null;
          synced_count?: number;
          metadata_only_count?: number;
          temporarily_failed_count?: number;
          stale_count?: number;
          deleted_count?: number;
          safe_message?: string | null;
          safe_error_code?: string | null;
          retryable?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<
          Database["public"]["Tables"]["canvas_course_sync_scope_states"]["Insert"]
        >;
        Relationships: [];
      };
      canvas_course_item_sync_states: {
        Row: {
          id: string;
          user_id: string;
          canvas_connection_id: string;
          course_id: string;
          scope: CanvasSyncScope;
          item_kind: string;
          item_key_hash: string;
          item_state: CanvasSyncItemState;
          source_updated_at: string | null;
          source_fingerprint: string | null;
          last_seen_job_id: string | null;
          last_seen_at: string;
          last_successful_at: string | null;
          safe_error_code: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          canvas_connection_id: string;
          course_id: string;
          scope: CanvasSyncScope;
          item_kind: string;
          item_key_hash: string;
          item_state?: CanvasSyncItemState;
          source_updated_at?: string | null;
          source_fingerprint?: string | null;
          last_seen_job_id?: string | null;
          last_seen_at?: string;
          last_successful_at?: string | null;
          safe_error_code?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<
          Database["public"]["Tables"]["canvas_course_item_sync_states"]["Insert"]
        >;
        Relationships: [];
      };
      canvas_sync_runs: {
        Row: {
          id: string;
          user_id: string;
          canvas_connection_id: string;
          scope_course_id?: string | null;
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
          scope_course_id?: string | null;
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
          scope_course_id?: string | null;
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
            foreignKeyName: "canvas_sync_runs_scope_course_owner_fkey";
            columns: ["scope_course_id", "user_id", "canvas_connection_id"];
            isOneToOne: false;
            referencedRelation: "canvas_courses";
            referencedColumns: ["id", "user_id", "canvas_connection_id"];
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
      canvas_course_sync_preferences: {
        Row: {
          id: string;
          user_id: string;
          canvas_connection_id: string;
          course_id: string;
          selected: boolean;
          display_order: number | null;
          selected_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          canvas_connection_id: string;
          course_id: string;
          selected?: boolean;
          display_order?: number | null;
          selected_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          canvas_connection_id?: string;
          course_id?: string;
          selected?: boolean;
          display_order?: number | null;
          selected_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "canvas_course_sync_preferences_connection_user_fkey";
            columns: ["canvas_connection_id", "user_id"];
            isOneToOne: false;
            referencedRelation: "canvas_connections";
            referencedColumns: ["id", "user_id"];
          },
          {
            foreignKeyName: "canvas_course_sync_preferences_course_owner_fkey";
            columns: ["course_id", "user_id", "canvas_connection_id"];
            isOneToOne: false;
            referencedRelation: "canvas_courses";
            referencedColumns: ["id", "user_id", "canvas_connection_id"];
          },
          {
            foreignKeyName: "canvas_course_sync_preferences_user_id_fkey";
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
      canvas_files: {
        Row: {
          id: string;
          user_id: string;
          canvas_connection_id: string;
          course_id: string;
          canvas_course_id: string;
          canvas_file_id: string;
          folder_id: string | null;
          display_name: string;
          filename: string | null;
          content_type: string | null;
          size_bytes: number | null;
          locked: boolean | null;
          hidden: boolean | null;
          hidden_for_user: boolean | null;
          visibility_level: string | null;
          media_class: string | null;
          media_entry_id: string | null;
          canvas_created_at: string | null;
          canvas_updated_at: string | null;
          canvas_modified_at: string | null;
          lock_at: string | null;
          unlock_at: string | null;
          metadata_fingerprint: string;
          content_version_fingerprint: string;
          ingestion_eligibility: string;
          ingestion_status: string;
          current_sha256: string | null;
          stored_content_type: string | null;
          stored_byte_count: number | null;
          storage_bucket: string | null;
          storage_object_key: string | null;
          availability_status: string;
          first_synced_at: string;
          last_synced_at: string;
          last_successful_inventory_at: string | null;
          last_successful_ingestion_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          canvas_connection_id: string;
          course_id: string;
          canvas_course_id: string;
          canvas_file_id: string;
          folder_id?: string | null;
          display_name: string;
          filename?: string | null;
          content_type?: string | null;
          size_bytes?: number | null;
          locked?: boolean | null;
          hidden?: boolean | null;
          hidden_for_user?: boolean | null;
          visibility_level?: string | null;
          media_class?: string | null;
          media_entry_id?: string | null;
          canvas_created_at?: string | null;
          canvas_updated_at?: string | null;
          canvas_modified_at?: string | null;
          lock_at?: string | null;
          unlock_at?: string | null;
          metadata_fingerprint: string;
          content_version_fingerprint: string;
          ingestion_eligibility: string;
          ingestion_status?: string;
          current_sha256?: string | null;
          stored_content_type?: string | null;
          stored_byte_count?: number | null;
          storage_bucket?: string | null;
          storage_object_key?: string | null;
          availability_status?: string;
          first_synced_at?: string;
          last_synced_at?: string;
          last_successful_inventory_at?: string | null;
          last_successful_ingestion_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          canvas_connection_id?: string;
          course_id?: string;
          canvas_course_id?: string;
          canvas_file_id?: string;
          folder_id?: string | null;
          display_name?: string;
          filename?: string | null;
          content_type?: string | null;
          size_bytes?: number | null;
          locked?: boolean | null;
          hidden?: boolean | null;
          hidden_for_user?: boolean | null;
          visibility_level?: string | null;
          media_class?: string | null;
          media_entry_id?: string | null;
          canvas_created_at?: string | null;
          canvas_updated_at?: string | null;
          canvas_modified_at?: string | null;
          lock_at?: string | null;
          unlock_at?: string | null;
          metadata_fingerprint?: string;
          content_version_fingerprint?: string;
          ingestion_eligibility?: string;
          ingestion_status?: string;
          current_sha256?: string | null;
          stored_content_type?: string | null;
          stored_byte_count?: number | null;
          storage_bucket?: string | null;
          storage_object_key?: string | null;
          availability_status?: string;
          first_synced_at?: string;
          last_synced_at?: string;
          last_successful_inventory_at?: string | null;
          last_successful_ingestion_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "canvas_files_connection_user_fkey";
            columns: ["canvas_connection_id", "user_id"];
            isOneToOne: false;
            referencedRelation: "canvas_connections";
            referencedColumns: ["id", "user_id"];
          },
          {
            foreignKeyName: "canvas_files_course_owner_fkey";
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
            foreignKeyName: "canvas_files_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      canvas_file_references: {
        Row: {
          id: string;
          user_id: string;
          canvas_connection_id: string;
          course_id: string;
          file_id: string;
          reference_type: string;
          reference_identity: string;
          referenced_row_id: string | null;
          canvas_module_id: string | null;
          canvas_module_item_id: string | null;
          canvas_page_url: string | null;
          canvas_assignment_id: string | null;
          canvas_announcement_id: string | null;
          first_seen_at: string;
          last_seen_at: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          canvas_connection_id: string;
          course_id: string;
          file_id: string;
          reference_type: string;
          reference_identity: string;
          referenced_row_id?: string | null;
          canvas_module_id?: string | null;
          canvas_module_item_id?: string | null;
          canvas_page_url?: string | null;
          canvas_assignment_id?: string | null;
          canvas_announcement_id?: string | null;
          first_seen_at?: string;
          last_seen_at?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          canvas_connection_id?: string;
          course_id?: string;
          file_id?: string;
          reference_type?: string;
          reference_identity?: string;
          referenced_row_id?: string | null;
          canvas_module_id?: string | null;
          canvas_module_item_id?: string | null;
          canvas_page_url?: string | null;
          canvas_assignment_id?: string | null;
          canvas_announcement_id?: string | null;
          first_seen_at?: string;
          last_seen_at?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "canvas_file_references_file_owner_fkey";
            columns: [
              "file_id",
              "user_id",
              "canvas_connection_id",
              "course_id",
            ];
            isOneToOne: false;
            referencedRelation: "canvas_files";
            referencedColumns: [
              "id",
              "user_id",
              "canvas_connection_id",
              "course_id",
            ];
          },
          {
            foreignKeyName: "canvas_file_references_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      canvas_file_ingestion_results: {
        Row: {
          id: string;
          user_id: string;
          canvas_connection_id: string;
          course_id: string;
          file_id: string;
          status: string;
          result_code: string;
          retryable: boolean;
          bytes_stored: number | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          canvas_connection_id: string;
          course_id: string;
          file_id: string;
          status: string;
          result_code: string;
          retryable?: boolean;
          bytes_stored?: number | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          canvas_connection_id?: string;
          course_id?: string;
          file_id?: string;
          status?: string;
          result_code?: string;
          retryable?: boolean;
          bytes_stored?: number | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "canvas_file_ingestion_results_file_owner_fkey";
            columns: [
              "file_id",
              "user_id",
              "canvas_connection_id",
              "course_id",
            ];
            isOneToOne: false;
            referencedRelation: "canvas_files";
            referencedColumns: [
              "id",
              "user_id",
              "canvas_connection_id",
              "course_id",
            ];
          },
          {
            foreignKeyName: "canvas_file_ingestion_results_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      reviewer_source_snapshots: {
        Row: {
          id: string;
          user_id: string;
          preview_session_id: string;
          canvas_connection_id: string;
          course_id: string;
          source_mode: "canvas";
          source_title: string;
          original_preview_sha256: string;
          exact_source_text: string;
          exact_source_sha256: string;
          source_count: number;
          was_edited: boolean;
          normalization_version: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          preview_session_id: string;
          canvas_connection_id: string;
          course_id: string;
          source_mode?: "canvas";
          source_title: string;
          original_preview_sha256: string;
          exact_source_text: string;
          exact_source_sha256: string;
          source_count: number;
          was_edited: boolean;
          normalization_version: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          preview_session_id?: string;
          canvas_connection_id?: string;
          course_id?: string;
          source_mode?: "canvas";
          source_title?: string;
          original_preview_sha256?: string;
          exact_source_text?: string;
          exact_source_sha256?: string;
          source_count?: number;
          was_edited?: boolean;
          normalization_version?: string;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "reviewer_source_snapshots_preview_owner_fkey";
            columns: [
              "preview_session_id",
              "user_id",
              "canvas_connection_id",
              "course_id",
            ];
            isOneToOne: false;
            referencedRelation: "canvas_source_preview_sessions";
            referencedColumns: [
              "id",
              "user_id",
              "canvas_connection_id",
              "course_id",
            ];
          },
          {
            foreignKeyName: "reviewer_source_snapshots_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      reviewer_source_snapshot_items: {
        Row: {
          id: string;
          user_id: string;
          source_snapshot_id: string;
          ordinal: number;
          source_type: "page" | "assignment" | "announcement" | "file";
          source_title: string;
          source_row_id: string | null;
          canvas_connection_id: string;
          course_id: string;
          canvas_course_id: string;
          canvas_source_object_id: string | null;
          module_id: string | null;
          module_item_id: string | null;
          file_id: string | null;
          file_kind: "pdf" | "image" | null;
          mime_type: string | null;
          page_count: number | null;
          canvas_updated_at: string | null;
          local_synced_at: string | null;
          normalized_content_sha256: string;
          stored_content_sha256: string | null;
          parser_version: string | null;
          ocr_version: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          source_snapshot_id: string;
          ordinal: number;
          source_type: "page" | "assignment" | "announcement" | "file";
          source_title: string;
          source_row_id?: string | null;
          canvas_connection_id: string;
          course_id: string;
          canvas_course_id: string;
          canvas_source_object_id?: string | null;
          module_id?: string | null;
          module_item_id?: string | null;
          file_id?: string | null;
          file_kind?: "pdf" | "image" | null;
          mime_type?: string | null;
          page_count?: number | null;
          canvas_updated_at?: string | null;
          local_synced_at?: string | null;
          normalized_content_sha256: string;
          stored_content_sha256?: string | null;
          parser_version?: string | null;
          ocr_version?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          source_snapshot_id?: string;
          ordinal?: number;
          source_type?: "page" | "assignment" | "announcement" | "file";
          source_title?: string;
          source_row_id?: string | null;
          canvas_connection_id?: string;
          course_id?: string;
          canvas_course_id?: string;
          canvas_source_object_id?: string | null;
          module_id?: string | null;
          module_item_id?: string | null;
          file_id?: string | null;
          file_kind?: "pdf" | "image" | null;
          mime_type?: string | null;
          page_count?: number | null;
          canvas_updated_at?: string | null;
          local_synced_at?: string | null;
          normalized_content_sha256?: string;
          stored_content_sha256?: string | null;
          parser_version?: string | null;
          ocr_version?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "reviewer_source_snapshot_items_snapshot_owner_fkey";
            columns: ["source_snapshot_id", "user_id"];
            isOneToOne: false;
            referencedRelation: "reviewer_source_snapshots";
            referencedColumns: ["id", "user_id"];
          },
          {
            foreignKeyName: "reviewer_source_snapshot_items_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      reviewer_source_snapshot_blocks: {
        Row: {
          id: string;
          user_id: string;
          source_snapshot_id: string;
          source_snapshot_item_id: string;
          ordinal: number;
          source_ordinal: number;
          block_ordinal: number;
          block_kind:
            | "heading"
            | "paragraph"
            | "list_item"
            | "table"
            | "quote"
            | "code";
          block_text: string;
          block_sha256: string;
          heading_level: number | null;
          list_depth: number | null;
          list_style: "ordered" | "unordered" | null;
          table_structure: Json | null;
          page_number: number | null;
          slide_number: number | null;
          module_position: number | null;
          parser_version: string | null;
          ocr_version: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          source_snapshot_id: string;
          source_snapshot_item_id: string;
          ordinal: number;
          source_ordinal: number;
          block_ordinal: number;
          block_kind:
            | "heading"
            | "paragraph"
            | "list_item"
            | "table"
            | "quote"
            | "code";
          block_text: string;
          block_sha256: string;
          heading_level?: number | null;
          list_depth?: number | null;
          list_style?: "ordered" | "unordered" | null;
          table_structure?: Json | null;
          page_number?: number | null;
          slide_number?: number | null;
          module_position?: number | null;
          parser_version?: string | null;
          ocr_version?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          source_snapshot_id?: string;
          source_snapshot_item_id?: string;
          ordinal?: number;
          source_ordinal?: number;
          block_ordinal?: number;
          block_kind?:
            | "heading"
            | "paragraph"
            | "list_item"
            | "table"
            | "quote"
            | "code";
          block_text?: string;
          block_sha256?: string;
          heading_level?: number | null;
          list_depth?: number | null;
          list_style?: "ordered" | "unordered" | null;
          table_structure?: Json | null;
          page_number?: number | null;
          slide_number?: number | null;
          module_position?: number | null;
          parser_version?: string | null;
          ocr_version?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "reviewer_source_snapshot_blocks_item_context_fkey";
            columns: [
              "source_snapshot_item_id",
              "source_snapshot_id",
              "user_id",
            ];
            isOneToOne: false;
            referencedRelation: "reviewer_source_snapshot_items";
            referencedColumns: ["id", "source_snapshot_id", "user_id"];
          },
          {
            foreignKeyName: "reviewer_source_snapshot_blocks_snapshot_owner_fkey";
            columns: ["source_snapshot_id", "user_id"];
            isOneToOne: false;
            referencedRelation: "reviewer_source_snapshots";
            referencedColumns: ["id", "user_id"];
          },
          {
            foreignKeyName: "reviewer_source_snapshot_blocks_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      reviewer_source_snapshot_item_relationships: {
        Row: {
          id: string;
          user_id: string;
          source_snapshot_id: string;
          source_snapshot_item_id: string;
          related_source_snapshot_item_id: string;
          relationship_type: "same_source" | "same_content" | "canvas_reference";
          relationship_group_key: string;
          reference_type:
            | "none"
            | "module"
            | "page"
            | "assignment"
            | "announcement";
          reference_ordinal: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          source_snapshot_id: string;
          source_snapshot_item_id: string;
          related_source_snapshot_item_id: string;
          relationship_type: "same_source" | "same_content" | "canvas_reference";
          relationship_group_key: string;
          reference_type?:
            | "none"
            | "module"
            | "page"
            | "assignment"
            | "announcement";
          reference_ordinal?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          source_snapshot_id?: string;
          source_snapshot_item_id?: string;
          related_source_snapshot_item_id?: string;
          relationship_type?: "same_source" | "same_content" | "canvas_reference";
          relationship_group_key?: string;
          reference_type?:
            | "none"
            | "module"
            | "page"
            | "assignment"
            | "announcement";
          reference_ordinal?: number;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "reviewer_source_snapshot_item_relationships_item_context_fkey";
            columns: [
              "source_snapshot_item_id",
              "source_snapshot_id",
              "user_id",
            ];
            isOneToOne: false;
            referencedRelation: "reviewer_source_snapshot_items";
            referencedColumns: ["id", "source_snapshot_id", "user_id"];
          },
          {
            foreignKeyName: "reviewer_source_snapshot_item_relationships_related_context_fkey";
            columns: [
              "related_source_snapshot_item_id",
              "source_snapshot_id",
              "user_id",
            ];
            isOneToOne: false;
            referencedRelation: "reviewer_source_snapshot_items";
            referencedColumns: ["id", "source_snapshot_id", "user_id"];
          },
          {
            foreignKeyName: "reviewer_source_snapshot_item_relationships_snapshot_owner_fkey";
            columns: ["source_snapshot_id", "user_id"];
            isOneToOne: false;
            referencedRelation: "reviewer_source_snapshots";
            referencedColumns: ["id", "user_id"];
          },
          {
            foreignKeyName: "reviewer_source_snapshot_item_relationships_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      processing_policy_config: {
        Row: {
          id: string;
          max_active_jobs_per_user: number;
          max_queued_extraction_jobs_per_user: number;
          max_queued_generation_jobs_per_user: number;
          max_jobs_created_per_hour: number;
          max_daily_extraction_jobs: number;
          max_daily_generation_jobs: number;
          max_daily_ocr_pages_per_user: number;
          max_running_jobs_per_user: number;
          max_source_versions_per_document: number;
          failed_job_retention_days: number;
          completed_job_retention_days: number;
          event_retention_days: number;
          idempotency_retention_days: number;
          updated_at: string;
        };
        Insert: {
          id: string;
          max_active_jobs_per_user: number;
          max_queued_extraction_jobs_per_user: number;
          max_queued_generation_jobs_per_user: number;
          max_jobs_created_per_hour: number;
          max_daily_extraction_jobs: number;
          max_daily_generation_jobs: number;
          max_daily_ocr_pages_per_user?: number;
          max_running_jobs_per_user: number;
          max_source_versions_per_document: number;
          failed_job_retention_days: number;
          completed_job_retention_days: number;
          event_retention_days: number;
          idempotency_retention_days: number;
          updated_at?: string;
        };
        Update: Partial<
          Database["public"]["Tables"]["processing_policy_config"]["Insert"]
        >;
        Relationships: [];
      };
      document_assets: {
        Row: {
          id: string;
          user_id: string;
          original_file_name: string;
          safe_display_name: string;
          mime_type: string;
          byte_size: number;
          content_sha256: string | null;
          storage_bucket: string;
          storage_object_path: string;
          upload_status: "available" | "deleted" | "cleanup_pending";
          latest_extraction_result_id: string | null;
          selected_source_version_id: string | null;
          metadata: Json;
          created_at: string;
          updated_at: string;
          deleted_at: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          original_file_name: string;
          safe_display_name: string;
          mime_type: string;
          byte_size: number;
          content_sha256?: string | null;
          storage_bucket: string;
          storage_object_path: string;
          upload_status?: "available" | "deleted" | "cleanup_pending";
          latest_extraction_result_id?: string | null;
          selected_source_version_id?: string | null;
          metadata?: Json;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
        Update: Partial<
          Database["public"]["Tables"]["document_assets"]["Insert"]
        >;
        Relationships: [];
      };
      extraction_results: {
        Row: {
          id: string;
          user_id: string;
          document_asset_id: string;
          extraction_job_id: string | null;
          parser_policy_version: string;
          ocr_policy_version: string;
          normalization_version: string;
          status: "succeeded" | "failed" | "cancelled";
          raw_character_count: number;
          normalized_character_count: number;
          page_count: number;
          diagnostics: Json;
          raw_source_version_id: string | null;
          normalized_source_version_id: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          document_asset_id: string;
          extraction_job_id?: string | null;
          parser_policy_version: string;
          ocr_policy_version: string;
          normalization_version: string;
          status: "succeeded" | "failed" | "cancelled";
          raw_character_count: number;
          normalized_character_count: number;
          page_count: number;
          diagnostics?: Json;
          raw_source_version_id?: string | null;
          normalized_source_version_id?: string | null;
          created_at?: string;
        };
        Update: Partial<
          Database["public"]["Tables"]["extraction_results"]["Insert"]
        >;
        Relationships: [];
      };
      source_versions: {
        Row: {
          id: string;
          user_id: string;
          document_asset_id: string | null;
          extraction_result_id: string | null;
          parent_source_version_id: string | null;
          revision_kind:
            | "extracted_raw"
            | "normalized"
            | "user_edited"
            | "regenerated"
            | "imported_text"
            | "canvas_resolved";
          content_sha256: string;
          source_text: string;
          character_count: number;
          normalization_version: string | null;
          created_by: "system" | "user";
          created_at: string;
          superseded_at: string | null;
          metadata: Json;
        };
        Insert: {
          id?: string;
          user_id: string;
          document_asset_id?: string | null;
          extraction_result_id?: string | null;
          parent_source_version_id?: string | null;
          revision_kind:
            | "extracted_raw"
            | "normalized"
            | "user_edited"
            | "regenerated"
            | "imported_text"
            | "canvas_resolved";
          content_sha256: string;
          source_text: string;
          character_count: number;
          normalization_version?: string | null;
          created_by: "system" | "user";
          created_at?: string;
          superseded_at?: string | null;
          metadata?: Json;
        };
        Update: Partial<
          Database["public"]["Tables"]["source_versions"]["Insert"]
        >;
        Relationships: [];
      };
      generated_artifacts: {
        Row: {
          id: string;
          user_id: string;
          artifact_type:
            | "reviewer"
            | "flashcards"
            | "quiz"
            | "summary"
            | "practice_test"
            | "study_guide";
          safe_title: string;
          source_version_id: string;
          latest_version_id: string | null;
          metadata: Json;
          created_at: string;
          updated_at: string;
          deleted_at: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          artifact_type:
            | "reviewer"
            | "flashcards"
            | "quiz"
            | "summary"
            | "practice_test"
            | "study_guide";
          safe_title: string;
          source_version_id: string;
          latest_version_id?: string | null;
          metadata?: Json;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
        Update: Partial<
          Database["public"]["Tables"]["generated_artifacts"]["Insert"]
        >;
        Relationships: [];
      };
      generated_artifact_versions: {
        Row: {
          id: string;
          user_id: string;
          artifact_id: string;
          version_number: number;
          source_version_id: string;
          source_content_sha256: string;
          artifact_type:
            | "reviewer"
            | "flashcards"
            | "quiz"
            | "summary"
            | "practice_test"
            | "study_guide";
          payload: Json;
          generation_policy_version: string;
          engine_version: string;
          schema_version: string;
          provider_id: string;
          settings_fingerprint: string;
          generation_job_id: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          artifact_id: string;
          version_number: number;
          source_version_id: string;
          source_content_sha256: string;
          artifact_type:
            | "reviewer"
            | "flashcards"
            | "quiz"
            | "summary"
            | "practice_test"
            | "study_guide";
          payload: Json;
          generation_policy_version: string;
          engine_version: string;
          schema_version: string;
          provider_id: string;
          settings_fingerprint: string;
          generation_job_id?: string | null;
          created_at?: string;
        };
        Update: Partial<
          Database["public"]["Tables"]["generated_artifact_versions"]["Insert"]
        >;
        Relationships: [];
      };
      processing_cleanup_queue: {
        Row: {
          id: string;
          owner_user_id: string | null;
          storage_bucket: string;
          storage_object_path: string;
          reason: "document_deleted" | "account_deleted" | "orphaned_staging";
          not_before: string;
          status: "pending" | "running" | "completed" | "failed";
          attempt_count: number;
          last_error_code: string | null;
          created_at: string;
          completed_at: string | null;
        };
        Insert: {
          id?: string;
          owner_user_id?: string | null;
          storage_bucket: string;
          storage_object_path: string;
          reason: "document_deleted" | "account_deleted" | "orphaned_staging";
          not_before: string;
          status?: "pending" | "running" | "completed" | "failed";
          attempt_count?: number;
          last_error_code?: string | null;
          created_at?: string;
          completed_at?: string | null;
        };
        Update: Partial<
          Database["public"]["Tables"]["processing_cleanup_queue"]["Insert"]
        >;
        Relationships: [];
      };
      processing_worker_heartbeats: {
        Row: {
          worker_id: string;
          status: "running" | "stopped" | "error";
          capacity: number;
          active_job_count: number;
          build_revision: string | null;
          started_at: string;
          last_seen_at: string;
          stopped_at: string | null;
        };
        Insert: {
          worker_id: string;
          status: "running" | "stopped" | "error";
          capacity: number;
          active_job_count: number;
          build_revision?: string | null;
          started_at?: string;
          last_seen_at?: string;
          stopped_at?: string | null;
        };
        Update: Partial<
          Database["public"]["Tables"]["processing_worker_heartbeats"]["Insert"]
        >;
        Relationships: [];
      };
      processing_job_sources: {
        Row: {
          id: string;
          user_id: string;
          source_kind: "pdf" | "image" | "text";
          display_name: string;
          mime_type: string;
          storage_bucket: string | null;
          storage_object_path: string | null;
          source_text: string | null;
          byte_size: number | null;
          source_character_count: number | null;
          page_count: number | null;
          metadata: Json;
          created_at: string;
          document_asset_id: string | null;
          source_version_id: string | null;
          content_sha256: string | null;
          parser_policy_version: string | null;
          ocr_policy_version: string | null;
          normalization_version: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          source_kind: "pdf" | "image" | "text";
          display_name: string;
          mime_type: string;
          storage_bucket?: string | null;
          storage_object_path?: string | null;
          source_text?: string | null;
          byte_size?: number | null;
          source_character_count?: number | null;
          page_count?: number | null;
          metadata?: Json;
          created_at?: string;
          document_asset_id?: string | null;
          source_version_id?: string | null;
          content_sha256?: string | null;
          parser_policy_version?: string | null;
          ocr_policy_version?: string | null;
          normalization_version?: string | null;
        };
        Update: {
          id?: string;
          user_id?: string;
          source_kind?: "pdf" | "image" | "text";
          display_name?: string;
          mime_type?: string;
          storage_bucket?: string | null;
          storage_object_path?: string | null;
          source_text?: string | null;
          byte_size?: number | null;
          source_character_count?: number | null;
          page_count?: number | null;
          metadata?: Json;
          created_at?: string;
          document_asset_id?: string | null;
          source_version_id?: string | null;
          content_sha256?: string | null;
          parser_policy_version?: string | null;
          ocr_policy_version?: string | null;
          normalization_version?: string | null;
        };
        Relationships: [];
      };
      processing_jobs: {
        Row: ProcessingJobDatabaseRow;
        Insert: {
          id?: string;
          user_id: string;
          job_type: ProcessingJobType;
          status?: ProcessingJobStatus;
          stage: ProcessingJobStage;
          status_message?: string;
          completed_units?: number | null;
          total_units?: number | null;
          unit_label?: "pages" | "sections" | null;
          source_metadata?: Json;
          metrics?: Json;
          source_snapshot_id: string;
          result_id?: string | null;
          idempotency_key: string;
          request_fingerprint: string;
          idempotency_expires_at?: string;
          retry_of_job_id?: string | null;
          created_at?: string;
          accepted_at?: string;
          started_at?: string | null;
          updated_at?: string;
          completed_at?: string | null;
          failed_at?: string | null;
          cancellation_requested_at?: string | null;
          expires_at?: string;
          error_code?: string | null;
          safe_error_message?: string | null;
          retryable?: boolean;
          attempt_count?: number;
          max_attempts?: number;
          next_attempt_at?: string;
          lease_owner?: string | null;
          lease_expires_at?: string | null;
          heartbeat_at?: string | null;
          execution_backend?: "database_worker" | "vercel_workflow";
          workflow_run_id?: string | null;
          workflow_dispatched_at?: string | null;
          source_version_id?: string | null;
          artifact_type?:
            | "reviewer"
            | "flashcards"
            | "quiz"
            | "summary"
            | "practice_test"
            | "study_guide"
            | null;
          generation_policy_version?: string | null;
          engine_version?: string | null;
          schema_version?: string | null;
          provider_id?: string | null;
          settings_fingerprint?: string | null;
          language?: string | null;
          output_mode?: string | null;
          reuse_mode?: "fresh" | "reuse_existing";
          reuse_of_job_id?: string | null;
          reuse_candidate_artifact_version_id?: string | null;
          scheduled_for?: string;
          priority_class?: number;
        };
        Update: Partial<ProcessingJobDatabaseRow>;
        Relationships: [];
      };
      processing_job_checkpoints: {
        Row: {
          id: string;
          job_id: string;
          checkpoint_key: string;
          payload: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          job_id: string;
          checkpoint_key: string;
          payload?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          job_id?: string;
          checkpoint_key?: string;
          payload?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      processing_job_results: {
        Row: {
          id: string;
          job_id: string;
          user_id: string;
          source_snapshot_id: string;
          result_type: ProcessingJobType;
          payload: Json;
          metrics: Json;
          created_at: string;
          extraction_result_id: string | null;
          artifact_version_id: string | null;
        };
        Insert: {
          id?: string;
          job_id: string;
          user_id: string;
          source_snapshot_id: string;
          result_type: ProcessingJobType;
          payload: Json;
          metrics?: Json;
          created_at?: string;
          extraction_result_id?: string | null;
          artifact_version_id?: string | null;
        };
        Update: {
          id?: string;
          job_id?: string;
          user_id?: string;
          source_snapshot_id?: string;
          result_type?: ProcessingJobType;
          payload?: Json;
          metrics?: Json;
          created_at?: string;
          extraction_result_id?: string | null;
          artifact_version_id?: string | null;
        };
        Relationships: [];
      };
      processing_job_events: {
        Row: {
          id: string;
          job_id: string;
          user_id: string;
          event_type:
            | "job_succeeded"
            | "job_failed"
            | "job_cancelled"
            | "job_expired";
          payload: Json;
          created_at: string;
          delivered_at: string | null;
          artifact_version_id: string | null;
          safe_label: string | null;
          delivery_key: string;
          delivery_eligible: boolean;
        };
        Insert: {
          id?: string;
          job_id: string;
          user_id: string;
          event_type:
            | "job_succeeded"
            | "job_failed"
            | "job_cancelled"
            | "job_expired";
          payload?: Json;
          created_at?: string;
          delivered_at?: string | null;
          artifact_version_id?: string | null;
          safe_label?: string | null;
          delivery_key: string;
          delivery_eligible?: boolean;
        };
        Update: {
          id?: string;
          job_id?: string;
          user_id?: string;
          event_type?:
            | "job_succeeded"
            | "job_failed"
            | "job_cancelled"
            | "job_expired";
          payload?: Json;
          created_at?: string;
          delivered_at?: string | null;
          artifact_version_id?: string | null;
          safe_label?: string | null;
          delivery_key?: string;
          delivery_eligible?: boolean;
        };
        Relationships: [];
      };
      processing_upload_intents: {
        Row: {
          id: string;
          user_id: string;
          status: "pending" | "accepted" | "expired";
          source_kind: "pdf" | "image";
          display_name: string;
          mime_type: "application/pdf" | "image/png" | "image/jpeg";
          expected_byte_size: number;
          storage_bucket: string;
          storage_object_path: string;
          job_id: string | null;
          created_at: string;
          updated_at: string;
          expires_at: string;
          accepted_at: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          status?: "pending" | "accepted" | "expired";
          source_kind: "pdf" | "image";
          display_name: string;
          mime_type: "application/pdf" | "image/png" | "image/jpeg";
          expected_byte_size: number;
          storage_bucket: string;
          storage_object_path: string;
          job_id?: string | null;
          created_at?: string;
          updated_at?: string;
          expires_at: string;
          accepted_at?: string | null;
        };
        Update: Partial<
          Database["public"]["Tables"]["processing_upload_intents"]["Insert"]
        >;
        Relationships: [];
      };
      push_notification_devices: {
        Row: {
          id: string;
          user_id: string;
          installation_id: string;
          expo_push_token: string;
          platform: "ios" | "android";
          project_id: string;
          permission_status: "granted" | "denied" | "undetermined";
          enabled: boolean;
          created_at: string;
          updated_at: string;
          last_registered_at: string;
          invalidated_at: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          installation_id: string;
          expo_push_token: string;
          platform: "ios" | "android";
          project_id: string;
          permission_status: "granted" | "denied" | "undetermined";
          enabled?: boolean;
          created_at?: string;
          updated_at?: string;
          last_registered_at?: string;
          invalidated_at?: string | null;
        };
        Update: Partial<
          Database["public"]["Tables"]["push_notification_devices"]["Insert"]
        >;
        Relationships: [];
      };
      processing_notification_deliveries: {
        Row: {
          id: string;
          user_id: string;
          processing_event_id: string | null;
          device_id: string;
          delivery_key: string;
          notification_kind:
            | "test"
            | "extraction_ready"
            | "reviewer_ready"
            | "processing_needs_attention";
          status:
            | "queued"
            | "sending"
            | "ticketed"
            | "delivered"
            | "failed"
            | "invalid_device";
          attempt_count: number;
          next_attempt_at: string;
          lease_owner: string | null;
          lease_expires_at: string | null;
          expo_ticket_id: string | null;
          receipt_due_at: string | null;
          safe_error_code: string | null;
          created_at: string;
          updated_at: string;
          sent_at: string | null;
          delivered_at: string | null;
          failed_at: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          processing_event_id?: string | null;
          device_id: string;
          delivery_key: string;
          notification_kind:
            | "test"
            | "extraction_ready"
            | "reviewer_ready"
            | "processing_needs_attention";
          status?: "queued" | "sending" | "ticketed" | "delivered" | "failed" | "invalid_device";
          attempt_count?: number;
          next_attempt_at?: string;
          lease_owner?: string | null;
          lease_expires_at?: string | null;
          expo_ticket_id?: string | null;
          receipt_due_at?: string | null;
          safe_error_code?: string | null;
          created_at?: string;
          updated_at?: string;
          sent_at?: string | null;
          delivered_at?: string | null;
          failed_at?: string | null;
        };
        Update: Partial<
          Database["public"]["Tables"]["processing_notification_deliveries"]["Insert"]
        >;
        Relationships: [];
      };
      reviewers: {
        Row: {
          id: string;
          user_id: string;
          title: string;
          source_metadata: Json;
          reviewer_output: Json;
          source_snapshot_id: string | null;
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
          source_snapshot_id?: string | null;
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
          source_snapshot_id?: string | null;
          section_count?: number;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "reviewers_source_snapshot_owner_fkey";
            columns: ["source_snapshot_id", "user_id"];
            isOneToOne: false;
            referencedRelation: "reviewer_source_snapshots";
            referencedColumns: ["id", "user_id"];
          },
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
      import_canvas_assignments_as_tasks_v1: {
        Args: {
          p_user_id: string;
          p_assignment_ids: string[];
        };
        Returns: TaskRow[];
      };
      apply_study_plan_v1: {
        Args: {
          p_user_id: string;
          p_planning_starts_at: string;
          p_planning_ends_at: string;
          p_algorithm_version: "deterministic-v1";
          p_input_hash: string;
          p_sessions: Json;
        };
        Returns: Array<{
          study_plan_id: string;
          session_count: number;
        }>;
      };
      claim_processing_notification_deliveries: {
        Args: {
          p_worker_id: string;
          p_limit?: number;
          p_lease_seconds?: number;
          p_now?: string;
        };
        Returns: ProcessingNotificationDeliveryRow[];
      };
      claim_processing_notification_receipts: {
        Args: {
          p_worker_id: string;
          p_limit?: number;
          p_lease_seconds?: number;
          p_now?: string;
        };
        Returns: ProcessingNotificationDeliveryRow[];
      };
      create_processing_job: {
        Args: {
          p_user_id: string;
          p_job_type: string;
          p_idempotency_key: string;
          p_request_fingerprint: string;
          p_source_kind: string;
          p_display_name: string;
          p_mime_type: string;
          p_storage_bucket: string | null;
          p_storage_object_path: string | null;
          p_source_text: string | null;
          p_byte_size: number | null;
          p_source_character_count: number | null;
          p_page_count: number | null;
          p_source_metadata: Json;
          p_source_private_metadata: Json;
          p_expires_at?: string | null;
        };
        Returns: ProcessingJobDatabaseRow[];
      };
      create_processing_job_v2: {
        Args: {
          p_user_id: string;
          p_job_type: string;
          p_idempotency_key: string;
          p_request_fingerprint: string;
          p_source_kind: string;
          p_display_name: string;
          p_mime_type: string;
          p_storage_bucket: string | null;
          p_storage_object_path: string | null;
          p_source_text: string | null;
          p_byte_size: number | null;
          p_source_character_count: number | null;
          p_page_count: number | null;
          p_source_metadata: Json;
          p_source_private_metadata: Json;
          p_contract: Json;
          p_expires_at?: string | null;
        };
        Returns: ProcessingJobDatabaseRow[];
      };
      claim_processing_jobs: {
        Args: {
          p_worker_id: string;
          p_job_types: string[];
          p_limit?: number;
          p_lease_seconds?: number;
          p_now?: string;
        };
        Returns: ProcessingJobDatabaseRow[];
      };
      claim_processing_jobs_v2: {
        Args: {
          p_worker_id: string;
          p_job_types: string[];
          p_limit?: number;
          p_lease_seconds?: number;
          p_now?: string;
        };
        Returns: ProcessingJobDatabaseRow[];
      };
      attach_processing_job_workflow_v1: {
        Args: {
          p_job_id: string;
          p_workflow_run_id: string;
          p_dispatched_at?: string;
        };
        Returns: ProcessingJobDatabaseRow[];
      };
      prepare_processing_job_workflow_dispatch_v1: {
        Args: {
          p_job_id: string;
          p_prepared_at?: string;
        };
        Returns: ProcessingJobDatabaseRow[];
      };
      claim_processing_job_by_id_v1: {
        Args: {
          p_job_id: string;
          p_worker_id: string;
          p_lease_seconds?: number;
          p_now?: string;
        };
        Returns: ProcessingJobDatabaseRow[];
      };
      mark_processing_job_dispatch_failed_v1: {
        Args: {
          p_job_id: string;
          p_failed_at?: string;
        };
        Returns: ProcessingJobDatabaseRow[];
      };
      heartbeat_processing_job: {
        Args: {
          p_job_id: string;
          p_worker_id: string;
          p_lease_seconds?: number;
          p_now?: string;
        };
        Returns: ProcessingJobDatabaseRow[];
      };
      update_processing_job_progress: {
        Args: {
          p_job_id: string;
          p_worker_id: string;
          p_stage: string;
          p_status_message: string;
          p_completed_units?: number | null;
          p_total_units?: number | null;
          p_unit_label?: string | null;
          p_metrics?: Json;
        };
        Returns: ProcessingJobDatabaseRow[];
      };
      complete_processing_job: {
        Args: {
          p_job_id: string;
          p_worker_id: string;
          p_result_type: string;
          p_payload: Json;
          p_metrics?: Json;
          p_completed_at?: string;
        };
        Returns: ProcessingJobDatabaseRow[];
      };
      complete_processing_job_v2: {
        Args: {
          p_job_id: string;
          p_worker_id: string;
          p_result_type: string;
          p_payload: Json;
          p_metrics?: Json;
          p_completed_at?: string;
        };
        Returns: ProcessingJobDatabaseRow[];
      };
      fail_processing_job: {
        Args: {
          p_job_id: string;
          p_worker_id: string;
          p_error_code: string;
          p_safe_error_message: string;
          p_retryable: boolean;
          p_failed_at?: string;
        };
        Returns: ProcessingJobDatabaseRow[];
      };
      fail_processing_job_v2: {
        Args: {
          p_job_id: string;
          p_worker_id: string;
          p_error_code: string;
          p_safe_error_message: string;
          p_retryable: boolean;
          p_automatic_retryable: boolean;
          p_failed_at?: string;
        };
        Returns: ProcessingJobDatabaseRow[];
      };
      request_processing_job_cancellation: {
        Args: {
          p_user_id: string;
          p_job_id: string;
          p_requested_at?: string;
        };
        Returns: ProcessingJobDatabaseRow[];
      };
      retry_processing_job: {
        Args: {
          p_user_id: string;
          p_job_id: string;
          p_idempotency_key: string;
          p_requested_at?: string;
        };
        Returns: ProcessingJobDatabaseRow[];
      };
      recover_stale_processing_jobs: {
        Args: { p_now?: string };
        Returns: number;
      };
      create_source_version_revision: {
        Args: {
          p_user_id: string;
          p_parent_source_version_id: string;
          p_expected_parent_sha256: string;
          p_source_text: string;
          p_select_as_active?: boolean;
          p_created_at?: string;
        };
        Returns: Array<{
          source_version_id: string;
          content_sha256: string;
          conflict_detected: boolean;
          selected_as_active: boolean;
        }>;
      };
      soft_delete_document_asset: {
        Args: {
          p_user_id: string;
          p_document_asset_id: string;
          p_dependent_artifact_policy?: string;
          p_deleted_at?: string;
        };
        Returns: boolean;
      };
      soft_delete_generated_artifact: {
        Args: {
          p_user_id: string;
          p_artifact_id: string;
          p_deleted_at?: string;
        };
        Returns: boolean;
      };
      run_processing_lifecycle_cleanup: {
        Args: {
          p_now?: string;
          p_dry_run?: boolean;
        };
        Returns: Json;
      };
      record_processing_worker_heartbeat: {
        Args: {
          p_worker_id: string;
          p_status: "running" | "stopped" | "error";
          p_capacity: number;
          p_active_job_count: number;
          p_build_revision?: string | null;
          p_seen_at?: string;
        };
        Returns: undefined;
      };
      create_reviewer_source_snapshot: {
        Args: {
          p_user_id: string;
          p_preview_session_id: string;
          p_source_title: string;
          p_exact_source_text: string;
          p_exact_source_sha256: string;
          p_was_edited: boolean;
        };
        Returns: Array<{ id: string }>;
      };
      cleanup_expired_canvas_source_preview_sessions: {
        Args: {
          p_before?: string;
        };
        Returns: number;
      };
      cleanup_expired_canvas_source_structure_sessions: {
        Args: {
          p_before?: string;
        };
        Returns: number;
      };
      create_canvas_sync_job_v1: {
        Args: {
          p_user_id: string;
          p_canvas_connection_id: string;
          p_course_id: string;
          p_job_type: string;
          p_idempotency_key: string;
          p_request_fingerprint: string;
          p_source_metadata: Json;
        };
        Returns: CanvasSyncJobDatabaseRow[];
      };
      prepare_canvas_sync_job_workflow_dispatch_v1: {
        Args: {
          p_job_id: string;
        };
        Returns: CanvasSyncJobDatabaseRow[];
      };
      attach_canvas_sync_job_workflow_v1: {
        Args: {
          p_job_id: string;
          p_workflow_run_id: string;
        };
        Returns: CanvasSyncJobDatabaseRow[];
      };
      mark_canvas_sync_job_dispatch_failed_v1: {
        Args: {
          p_job_id: string;
        };
        Returns: CanvasSyncJobDatabaseRow[];
      };
      claim_canvas_sync_job_v1: {
        Args: {
          p_job_id: string;
          p_worker_id: string;
        };
        Returns: CanvasSyncJobDatabaseRow[];
      };
      update_canvas_sync_job_progress_v1: {
        Args: {
          p_job_id: string;
          p_worker_id: string;
          p_stage: string;
          p_status_message: string;
          p_completed_units: number;
          p_total_units: number | null;
        };
        Returns: CanvasSyncJobDatabaseRow[];
      };
      complete_canvas_sync_job_v1: {
        Args: {
          p_job_id: string;
          p_worker_id: string;
          p_result_summary: Json;
        };
        Returns: CanvasSyncJobDatabaseRow[];
      };
      fail_canvas_sync_job_v1: {
        Args: {
          p_job_id: string;
          p_worker_id: string;
          p_error_code: string;
          p_safe_error_message: string;
          p_retryable: boolean;
        };
        Returns: CanvasSyncJobDatabaseRow[];
      };
      request_canvas_sync_job_cancellation_v1: {
        Args: {
          p_user_id: string;
          p_job_id: string;
        };
        Returns: CanvasSyncJobDatabaseRow[];
      };
      retry_canvas_sync_job_v1: {
        Args: {
          p_user_id: string;
          p_job_id: string;
        };
        Returns: CanvasSyncJobDatabaseRow[];
      };
      retry_canvas_sync_job_v2: {
        Args: {
          p_user_id: string;
          p_job_id: string;
          p_idempotency_key: string;
        };
        Returns: CanvasSyncJobDatabaseRow[];
      };
      recover_stale_canvas_sync_operation_v1: {
        Args: {
          p_job_id: string;
          p_worker_id: string;
          p_stale_after_seconds?: number;
        };
        Returns: number;
      };
      initialize_canvas_sync_job_plan_v2: {
        Args: {
          p_job_id: string;
          p_worker_id: string;
          p_checkpoint_version: string;
          p_units: Json;
        };
        Returns: CanvasSyncJobDatabaseRow[];
      };
      claim_canvas_sync_job_units_v2: {
        Args: {
          p_job_id: string;
          p_worker_id: string;
          p_limit?: number;
          p_lease_seconds?: number;
        };
        Returns: CanvasSyncJobUnitRow[];
      };
      begin_canvas_sync_job_unit_attempt_v2: {
        Args: {
          p_unit_id: string;
          p_worker_id: string;
          p_lease_seconds?: number;
        };
        Returns: CanvasSyncJobUnitRow[];
      };
      complete_canvas_sync_job_unit_v2: {
        Args: {
          p_unit_id: string;
          p_worker_id: string;
          p_payload_kind: string;
          p_payload: Json | null;
          p_discovered_units?: Json;
        };
        Returns: CanvasSyncJobUnitRow[];
      };
      defer_canvas_sync_job_unit_v2: {
        Args: {
          p_unit_id: string;
          p_worker_id: string;
          p_error_code: string;
          p_safe_error_message: string;
          p_available_at: string;
        };
        Returns: CanvasSyncJobUnitRow[];
      };
      fail_canvas_sync_job_unit_v2: {
        Args: {
          p_unit_id: string;
          p_worker_id: string;
          p_error_code: string;
          p_safe_error_message: string;
          p_retryable: boolean;
        };
        Returns: CanvasSyncJobUnitRow[];
      };
      cancel_canvas_sync_job_plan_v2: {
        Args: {
          p_job_id: string;
          p_worker_id: string;
        };
        Returns: CanvasSyncJobDatabaseRow[];
      };
      begin_canvas_sync_promotion_v2: {
        Args: {
          p_job_id: string;
          p_worker_id: string;
        };
        Returns: CanvasSyncJobDatabaseRow[];
      };
      record_canvas_course_sync_health_v2: {
        Args: {
          p_job_id: string;
          p_scopes: Json;
          p_items: Json;
        };
        Returns: boolean;
      };
      complete_canvas_sync_job_v2: {
        Args: {
          p_job_id: string;
          p_worker_id: string;
          p_outcome: CanvasSyncJobOutcome;
          p_result_summary: Json;
        };
        Returns: CanvasSyncJobDatabaseRow[];
      };
      fail_canvas_sync_job_v2: {
        Args: {
          p_job_id: string;
          p_worker_id: string;
          p_error_code: string;
          p_safe_error_message: string;
          p_retryable: boolean;
        };
        Returns: CanvasSyncJobDatabaseRow[];
      };
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
      begin_canvas_course_sync_run: {
        Args: {
          p_user_id: string;
          p_canvas_connection_id: string;
          p_scope_course_id: string;
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
      begin_canvas_course_grade_sync: {
        Args: {
          p_user_id: string;
          p_canvas_connection_id: string;
          p_course_id: string;
          p_started_at?: string;
          p_stale_after_seconds?: number;
        };
        Returns: Array<{
          id: string;
          user_id: string;
          canvas_connection_id: string;
          course_id: string;
          sync_status: CanvasCourseGradeSyncStatus;
          last_checked_at: string | null;
          last_completed_at: string | null;
          last_successful_sync_at: string | null;
          last_completed_snapshot_authoritative: boolean;
          consecutive_failure_count: number;
          last_failure_code: string | null;
          last_failure_category: CanvasCourseGradeSyncFailureCategory | null;
          synced_assignment_count: number;
          synced_submission_count: number;
          synced_course_grade_summary_count: number;
          assignment_family_state: CanvasCourseGradeSyncFamilyState;
          submission_family_state: CanvasCourseGradeSyncFamilyState;
          course_grade_summary_family_state: CanvasCourseGradeSyncFamilyState;
          source_fingerprint: string | null;
          fingerprint_version: string | null;
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
      replace_canvas_course_sync_preferences: {
        Args: {
          p_user_id: string;
          p_canvas_connection_id: string;
          p_selected_course_ids: string[];
          p_selected_at?: string;
        };
        Returns: Array<{
          selected_count: number;
          deselected_count: number;
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
      replace_canvas_course_assignment_submission_snapshot: {
        Args: {
          p_user_id: string;
          p_canvas_connection_id: string;
          p_course_id: string;
          p_synced_at: string;
          p_assignments: Json;
          p_snapshot_fingerprint: string;
          p_fingerprint_version: string;
        };
        Returns: Array<{
          assignments_inserted: number;
          assignments_updated: number;
          assignments_unchanged: number;
          assignments_marked_absent: number;
          persisted_count: number;
        }>;
      };
      upsert_canvas_course_grade_summary: {
        Args: {
          p_user_id: string;
          p_canvas_connection_id: string;
          p_course_id: string;
          p_synced_at: string;
          p_summary: Json;
        };
        Returns: Array<{
          summaries_inserted: number;
          summaries_updated: number;
          summaries_unchanged: number;
          visible_field_count: number;
        }>;
      };
      finish_canvas_course_grade_sync: {
        Args: {
          p_user_id: string;
          p_canvas_connection_id: string;
          p_course_id: string;
          p_completed_at: string;
          p_status: "succeeded" | "partial" | "failed";
          p_assignment_family_state: "succeeded" | "failed";
          p_submission_family_state: "succeeded" | "failed";
          p_course_grade_summary_family_state: "succeeded" | "failed";
          p_assignment_count: number;
          p_submission_count: number;
          p_course_grade_summary_count: number;
          p_failure_code: string | null;
          p_failure_category: CanvasCourseGradeSyncFailureCategory | null;
          p_source_fingerprint: string | null;
          p_fingerprint_version: string | null;
        };
        Returns: Array<{
          id: string;
          user_id: string;
          canvas_connection_id: string;
          course_id: string;
          sync_status: CanvasCourseGradeSyncStatus;
          last_checked_at: string | null;
          last_completed_at: string | null;
          last_successful_sync_at: string | null;
          last_completed_snapshot_authoritative: boolean;
          consecutive_failure_count: number;
          last_failure_code: string | null;
          last_failure_category: CanvasCourseGradeSyncFailureCategory | null;
          synced_assignment_count: number;
          synced_submission_count: number;
          synced_course_grade_summary_count: number;
          assignment_family_state: CanvasCourseGradeSyncFamilyState;
          submission_family_state: CanvasCourseGradeSyncFamilyState;
          course_grade_summary_family_state: CanvasCourseGradeSyncFamilyState;
          source_fingerprint: string | null;
          fingerprint_version: string | null;
          created_at: string;
          updated_at: string;
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
      replace_canvas_course_files_inventory: {
        Args: {
          p_user_id: string;
          p_canvas_connection_id: string;
          p_sync_run_id: string;
          p_synced_at: string;
          p_canvas_course_id: string;
          p_files: Json;
          p_references: Json;
        };
        Returns: Array<{
          files_inserted: number;
          files_updated: number;
          files_unchanged: number;
          files_deactivated: number;
          references_inserted: number;
          references_deleted: number;
          module_file_references: number;
          html_file_references: number;
          metadata_only_files: number;
          blocked_files: number;
        }>;
      };
      record_canvas_file_ingestion_result: {
        Args: {
          p_user_id: string;
          p_canvas_connection_id: string;
          p_file_id: string;
          p_status: string;
          p_result_code: string;
          p_retryable: boolean;
          p_bytes_stored: number | null;
        };
        Returns: Array<{
          id: string;
          user_id: string;
          canvas_connection_id: string;
          course_id: string;
          file_id: string;
          status: string;
          result_code: string;
          retryable: boolean;
          bytes_stored: number | null;
          created_at: string;
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
