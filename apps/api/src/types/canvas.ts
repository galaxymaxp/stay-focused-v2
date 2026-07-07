import type {
  CanvasCapability,
  CanvasCapabilityStatus,
  CanvasCourse,
} from "@stay-focused/canvas";

export interface CanvasConnectionSummary {
  readonly id: string;
  readonly baseUrl: string;
  readonly canvasUserId: string;
  readonly canvasUserName: string;
  readonly canvasUserEmail: string | null;
  readonly status: string;
  readonly lastVerifiedAt: string;
  readonly lastErrorCode: string | null;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface CanvasCapabilitySummary {
  readonly id?: string;
  readonly capability: CanvasCapability;
  readonly status: CanvasCapabilityStatus;
  readonly testedAt: string | null;
  readonly safeErrorCode: string | null;
  readonly courseId: string | null;
  readonly integrationVersion: string | null;
}

export interface CanvasConnectionResponse {
  readonly ok: true;
  readonly connection: CanvasConnectionSummary | null;
  readonly capabilities?: readonly CanvasCapabilitySummary[];
  readonly courses?: readonly CanvasCourse[];
}

export type CanvasCourseClassification =
  | "likely_current"
  | "past_or_concluded"
  | "other_or_uncertain"
  | "unavailable";

export interface CanvasCourseInventoryItem {
  readonly id: string;
  readonly displayName: string;
  readonly courseCode: string | null;
  readonly workflowState: string | null;
  readonly startAt: string | null;
  readonly endAt: string | null;
  readonly term: {
    readonly id: string | null;
    readonly name: string | null;
    readonly startAt: string | null;
    readonly endAt: string | null;
  } | null;
  readonly classification: CanvasCourseClassification;
  readonly selectable: boolean;
  readonly unavailableReason: string | null;
  readonly selected: boolean;
  readonly lastSync: {
    readonly status: "running" | "success" | "partial" | "failed";
    readonly startedAt: string | null;
    readonly completedAt: string | null;
    readonly lastCheckedAt: string | null;
    readonly lastSuccessfulSyncAt: string | null;
    readonly failureCode: string | null;
  } | null;
}

export interface CanvasCourseInventoryCounts {
  readonly total: number;
  readonly likelyCurrent: number;
  readonly pastOrConcluded: number;
  readonly otherOrUncertain: number;
  readonly unavailable: number;
}

export interface CanvasCoursesResponse {
  readonly ok: true;
  readonly courses: readonly CanvasCourseInventoryItem[];
  readonly selectedCourseIds: readonly string[];
  readonly counts: CanvasCourseInventoryCounts;
}

export interface CanvasCoursePreferencesResponse {
  readonly ok: true;
  readonly selectedCourseIds: readonly string[];
}

export interface CanvasCoursePreferencesUpdateResponse {
  readonly ok: true;
  readonly selectedCourseIds: readonly string[];
  readonly selectedCount: number;
  readonly deselectedCount: number;
}

export interface CanvasCapabilitiesResponse {
  readonly ok: true;
  readonly capabilities: readonly CanvasCapabilitySummary[];
}

export type CanvasSyncStatus = "succeeded" | "partial" | "failed";
export type CanvasSyncMode = "full" | "incremental";

export interface CanvasSyncSummary {
  readonly status: CanvasSyncStatus;
  readonly mode: CanvasSyncMode;
  readonly syncWindow: {
    readonly startDate: string;
    readonly endDate: string;
  };
  readonly courses: {
    readonly discovered: number;
    readonly succeeded: number;
    readonly changed: number;
    readonly unchanged: number;
    readonly failed: number;
  };
  readonly plannerItems: {
    readonly discovered: number;
    readonly inserted: number;
    readonly updated: number;
    readonly unchanged: number;
    readonly pruned: number;
    readonly failed: number;
  };
  readonly announcements: {
    readonly discovered: number;
    readonly inserted: number;
    readonly updated: number;
    readonly unchanged: number;
    readonly pruned: number;
    readonly coursesSucceeded: number;
    readonly coursesFailed: number;
  };
  readonly files: {
    readonly coursesSucceeded: number;
    readonly coursesFailed: number;
    readonly discovered: number;
    readonly inserted: number;
    readonly updated: number;
    readonly unchanged: number;
    readonly deactivated: number;
    readonly references: number;
    readonly referencesInserted: number;
    readonly referencesDeleted: number;
    readonly moduleFileReferences: number;
    readonly htmlFileReferences: number;
    readonly metadataOnly: number;
    readonly blocked: number;
  };
  readonly resources: {
    readonly modules: number;
    readonly moduleItems: number;
    readonly pages: number;
    readonly assignmentGroups: number;
    readonly assignments: number;
    readonly plannerItems: number;
    readonly announcements: number;
    readonly files: number;
    readonly fileReferences: number;
  };
  readonly retryAttempts: number;
  readonly failures?: readonly {
    readonly code: string;
    readonly count: number;
  }[];
}

export interface CanvasSyncResponse extends CanvasSyncSummary {
  readonly ok: true;
}

export interface CanvasCourseScopedSyncSummary {
  readonly status: "success" | "partial" | "failed";
  readonly startedAt: string;
  readonly completedAt: string;
  readonly durationMs: number;
  readonly resources: CanvasSyncSummary["resources"];
  readonly modules: number;
  readonly moduleItems: number;
  readonly pages: number;
  readonly assignmentGroups: number;
  readonly assignments: number;
  readonly announcements: number;
  readonly files: number;
  readonly fileReferences: number;
  readonly inserted: number;
  readonly updated: number;
  readonly unchanged: number;
  readonly pruned: number;
  readonly retryAttempts: number;
  readonly sanitizedFailures?: readonly {
    readonly code: string;
    readonly count: number;
  }[];
}

export interface CanvasCourseScopedSyncResponse
  extends CanvasCourseScopedSyncSummary {
  readonly ok: true;
}

export type CanvasReviewerSourceType =
  | "page"
  | "assignment"
  | "announcement"
  | "file";

export type CanvasReviewerFileKind = "pdf" | "image" | "unsupported";

export type CanvasReviewerFilePreparationStatus =
  | "ready"
  | "not_prepared"
  | "failed"
  | "blocked"
  | "unsupported"
  | "unavailable";

export interface CanvasReviewerFileState {
  readonly kind: CanvasReviewerFileKind;
  readonly preparationStatus: CanvasReviewerFilePreparationStatus;
  readonly canPrepare: boolean;
}

export interface CanvasReviewerCourseSyncSummary {
  readonly status: "success" | "partial" | "failed" | "never";
  readonly completedAt: string | null;
  readonly lastSuccessfulSyncAt: string | null;
  readonly latestResultWasPartial: boolean;
  readonly synchronizedSourcesAvailable: boolean;
  readonly failureCategories: readonly string[];
}

export interface CanvasReviewerSourceDescriptor {
  readonly id: string;
  readonly type: CanvasReviewerSourceType;
  readonly title: string;
  readonly availability: "available" | "unavailable";
  readonly unavailableReason: string | null;
  readonly updatedAt: string | null;
  readonly estimatedCharacters: number | null;
  readonly file: CanvasReviewerFileState | null;
}

export interface CanvasReviewerSourceListResponse {
  readonly ok: true;
  readonly courseId: string;
  readonly courseSync: CanvasReviewerCourseSyncSummary;
  readonly availableSourceCount: number;
  readonly unavailableSourceCount: number;
  readonly sources: readonly CanvasReviewerSourceDescriptor[];
  readonly pagination: {
    readonly limit: number;
    readonly offset: number;
    readonly returned: number;
    readonly hasMore: boolean;
    readonly totalKnown: number;
  };
}

export interface CanvasReviewerSourcePreviewResponse {
  readonly ok: true;
  readonly previewSessionId: string;
  readonly sourceText: string;
  readonly suggestedTitle: string;
  readonly sourceCount: number;
  readonly characterCount: number;
  readonly sources: readonly {
    readonly id: string;
    readonly type: CanvasReviewerSourceType;
    readonly updatedAt: string | null;
    readonly fileKind?: Exclude<CanvasReviewerFileKind, "unsupported">;
    readonly pageCount?: number;
  }[];
  readonly courseSync: {
    readonly status: "success" | "partial" | "failed" | "never";
    readonly completedAt: string | null;
  };
  readonly limits: {
    readonly maximumSources: number;
    readonly maximumCharactersPerSource: number;
    readonly maximumCombinedPreviewCharacters: number;
    readonly maximumOcrFilesPerPreview: number;
    readonly existingReviewerRequestLimit: number;
    readonly suggestedTitleLimit: number;
  };
}

export interface CanvasReviewerSourcePrepareResponse {
  readonly ok: true;
  readonly requested: number;
  readonly results: readonly {
    readonly id: string;
    readonly status: "ready" | "failed" | "blocked" | "unsupported" | "unavailable";
    readonly code: string;
    readonly retryable: boolean;
  }[];
  readonly sources: readonly CanvasReviewerSourceDescriptor[];
}

export type CanvasFileIngestionResultStatus =
  | "stored"
  | "unchanged"
  | "metadata_only"
  | "blocked"
  | "failed"
  | "unavailable";

export interface CanvasFileIngestionItemResult {
  readonly fileId: string;
  readonly status: CanvasFileIngestionResultStatus;
  readonly code: string;
  readonly retryable: boolean;
  readonly bytesStored: number | null;
}

export interface CanvasFileIngestionResponse {
  readonly ok: true;
  readonly requested: number;
  readonly succeeded: number;
  readonly unchanged: number;
  readonly metadataOnly: number;
  readonly blocked: number;
  readonly failed: number;
  readonly unavailable: number;
  readonly totalBytesStored: number;
  readonly results: readonly CanvasFileIngestionItemResult[];
}

export interface CanvasDeleteResponse {
  readonly ok: true;
}

export interface CanvasApiErrorResponse {
  readonly ok: false;
  readonly error: {
    readonly code: CanvasApiErrorCode;
    readonly message: string;
    readonly details?: {
      readonly selectedSourceCount?: number;
      readonly maximumSourceCount?: number;
      readonly combinedCharacterCount?: number;
      readonly allowedMaximum?: number;
    };
  };
  readonly sync?: CanvasSyncSummary | CanvasCourseScopedSyncSummary;
}

export type CanvasApiErrorCode =
  | "unauthorized"
  | "invalid_json"
  | "invalid_request"
  | "payload_too_large"
  | "invalid_canvas_url"
  | "invalid_canvas_token"
  | "canvas_permission_denied"
  | "canvas_rate_limited"
  | "canvas_unavailable"
  | "canvas_timeout"
  | "canvas_connection_missing"
  | "canvas_connection_corrupt"
  | "canvas_sync_in_progress"
  | "canvas_course_not_found"
  | "canvas_course_not_selected"
  | "canvas_course_unavailable"
  | "canvas_storage_not_configured"
  | "canvas_file_not_found"
  | "canvas_source_count_exceeded"
  | "canvas_source_duplicate"
  | "canvas_source_not_found"
  | "canvas_source_file_preparation_required"
  | "canvas_source_ocr_file_limit_exceeded"
  | "canvas_source_stored_file_missing"
  | "canvas_source_stored_file_corrupt"
  | "canvas_source_unsupported_file_type"
  | "canvas_source_image_ocr_empty"
  | "canvas_source_pdf_ocr_empty"
  | "canvas_source_ocr_empty"
  | "canvas_source_pdf_encrypted"
  | "canvas_source_pdf_page_limit_exceeded"
  | "canvas_source_ocr_not_configured"
  | "canvas_source_ocr_failed"
  | "canvas_source_storage_read_failed"
  | "canvas_source_preview_too_large"
  | "canvas_source_unavailable"
  | "canvas_storage_failed";

export type CanvasApiResponse =
  | CanvasConnectionResponse
  | CanvasCoursesResponse
  | CanvasCoursePreferencesResponse
  | CanvasCoursePreferencesUpdateResponse
  | CanvasCapabilitiesResponse
  | CanvasSyncResponse
  | CanvasCourseScopedSyncResponse
  | CanvasReviewerSourceListResponse
  | CanvasReviewerSourcePreviewResponse
  | CanvasReviewerSourcePrepareResponse
  | CanvasFileIngestionResponse
  | CanvasDeleteResponse
  | CanvasApiErrorResponse;
