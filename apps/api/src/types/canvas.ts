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

export interface CanvasCoursesResponse {
  readonly ok: true;
  readonly courses: readonly CanvasCourse[];
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
  readonly courses: {
    readonly discovered: number;
    readonly succeeded: number;
    readonly changed: number;
    readonly unchanged: number;
    readonly failed: number;
  };
  readonly resources: {
    readonly modules: number;
    readonly moduleItems: number;
    readonly pages: number;
    readonly assignmentGroups: number;
    readonly assignments: number;
  };
  readonly failures?: readonly {
    readonly code: string;
    readonly count: number;
  }[];
}

export interface CanvasSyncResponse extends CanvasSyncSummary {
  readonly ok: true;
}

export interface CanvasDeleteResponse {
  readonly ok: true;
}

export interface CanvasApiErrorResponse {
  readonly ok: false;
  readonly error: {
    readonly code: CanvasApiErrorCode;
    readonly message: string;
  };
  readonly sync?: CanvasSyncSummary;
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
  | "canvas_storage_not_configured"
  | "canvas_storage_failed";

export type CanvasApiResponse =
  | CanvasConnectionResponse
  | CanvasCoursesResponse
  | CanvasCapabilitiesResponse
  | CanvasSyncResponse
  | CanvasDeleteResponse
  | CanvasApiErrorResponse;
