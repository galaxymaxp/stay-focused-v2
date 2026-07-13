import { createHash } from "node:crypto";

import {
  isMeaningfulCanvasContent,
  normalizeCanvasHtmlToText,
} from "./canvas-content-normalization";
import { sanitizeCanvasPreviewText } from "./canvas-source-safety";

export type CanvasUsableContentStatus =
  | "usable"
  | "empty"
  | "unsupported"
  | "inaccessible"
  | "failed";

export type CanvasUsableContentSourceKind =
  | "page"
  | "assignment"
  | "announcement"
  | "file"
  | "module_item";

export type CanvasUsableContentMethod =
  | "synchronized_page_html"
  | "synchronized_assignment_html"
  | "synchronized_announcement_html"
  | "stored_image_ocr"
  | "stored_pdf_ocr"
  | "module_reference";

export interface CanvasUsableContentProvenance {
  readonly resourceId?: string;
  readonly moduleId?: string;
  readonly moduleItemId?: string;
  readonly canvasObjectId?: string;
  readonly contentSha256?: string;
}

export interface CanvasFileResolution {
  readonly status: CanvasUsableContentStatus;
  readonly text?: string;
  readonly evidence?: Readonly<Record<string, unknown>>;
}

export interface CanvasUsableContentCandidate {
  readonly sourceId: string;
  readonly sourceKind: CanvasUsableContentSourceKind;
  readonly method: CanvasUsableContentMethod;
  readonly userId: string;
  readonly connectionId: string;
  readonly courseId: string;
  readonly expectedUserId: string;
  readonly expectedConnectionId: string;
  readonly expectedCourseId: string;
  readonly accessible: boolean;
  readonly html?: string | null;
  readonly title?: string;
  readonly moduleItemType?: string | null;
  readonly provenance: CanvasUsableContentProvenance;
  readonly extractFile?: () => Promise<CanvasFileResolution>;
  readonly resolveLinkedItem?: () => Promise<CanvasUsableContentCandidate | null>;
}

export interface CanvasUsableContentResolution {
  readonly status: CanvasUsableContentStatus;
  readonly sourceKind: CanvasUsableContentSourceKind;
  readonly method: CanvasUsableContentMethod;
  readonly sourceText?: string;
  readonly contentFingerprint?: string;
  readonly provenance: CanvasUsableContentProvenance & {
    readonly method: CanvasUsableContentMethod;
  };
  readonly evidence?: Readonly<Record<string, unknown>>;
  readonly safeFailureCategory?:
    | "content_empty"
    | "source_unsupported"
    | "source_inaccessible"
    | "resolution_failed";
}

const SUPPORTED_MODULE_ITEM_TYPES = new Set(["Page", "Assignment", "File"]);

export async function resolveCanvasUsableContent(
  candidate: CanvasUsableContentCandidate,
): Promise<CanvasUsableContentResolution> {
  if (!ownsCandidate(candidate) || !candidate.accessible) {
    return terminal(candidate, "inaccessible");
  }

  if (candidate.sourceKind === "module_item") {
    if (
      !candidate.moduleItemType ||
      !SUPPORTED_MODULE_ITEM_TYPES.has(candidate.moduleItemType)
    ) {
      return terminal(candidate, "unsupported");
    }
    if (!candidate.resolveLinkedItem) {
      return terminal(candidate, "inaccessible");
    }
    const linked = await candidate.resolveLinkedItem();
    if (!linked) {
      return terminal(candidate, "inaccessible");
    }
    const resolved = await resolveCanvasUsableContent(linked);
    return {
      ...resolved,
      provenance: {
        ...candidate.provenance,
        ...resolved.provenance,
        method: resolved.method,
      },
    };
  }

  if (candidate.sourceKind === "file") {
    if (
      (candidate.method !== "stored_image_ocr" &&
        candidate.method !== "stored_pdf_ocr") ||
      !candidate.extractFile
    ) {
      return terminal(candidate, "unsupported");
    }
    let extracted: CanvasFileResolution;
    try {
      extracted = await candidate.extractFile();
    } catch {
      return terminal(candidate, "failed");
    }
    if (extracted.status !== "usable") {
      return terminal(candidate, extracted.status);
    }
    if (!extracted.text) {
      return terminal(candidate, "empty");
    }
    return usable(candidate, extracted.text, extracted.evidence);
  }

  if (!isHtmlMethodForKind(candidate)) {
    return terminal(candidate, "unsupported");
  }
  const text = normalizeCanvasHtmlToText(candidate.html ?? null);
  return isMeaningfulCanvasContent(text)
    ? usable(candidate, text)
    : terminal(candidate, "empty");
}

function ownsCandidate(candidate: CanvasUsableContentCandidate): boolean {
  return (
    candidate.userId === candidate.expectedUserId &&
    candidate.connectionId === candidate.expectedConnectionId &&
    candidate.courseId === candidate.expectedCourseId
  );
}

function isHtmlMethodForKind(candidate: CanvasUsableContentCandidate): boolean {
  return (
    (candidate.sourceKind === "page" &&
      candidate.method === "synchronized_page_html") ||
    (candidate.sourceKind === "assignment" &&
      candidate.method === "synchronized_assignment_html") ||
    (candidate.sourceKind === "announcement" &&
      candidate.method === "synchronized_announcement_html")
  );
}

function usable(
  candidate: CanvasUsableContentCandidate,
  rawText: string,
  evidence?: Readonly<Record<string, unknown>>,
): CanvasUsableContentResolution {
  const sourceText = sanitizeCanvasPreviewText(rawText);
  if (!isMeaningfulCanvasContent(sourceText)) {
    return terminal(candidate, "empty");
  }
  const contentFingerprint = createHash("sha256").update(sourceText, "utf8").digest("hex");
  return {
    status: "usable",
    sourceKind: candidate.sourceKind,
    method: candidate.method,
    sourceText,
    contentFingerprint,
    provenance: {
      ...candidate.provenance,
      contentSha256: contentFingerprint,
      method: candidate.method,
    },
    ...(evidence ? { evidence } : {}),
  };
}

function terminal(
  candidate: CanvasUsableContentCandidate,
  status: Exclude<CanvasUsableContentStatus, "usable">,
): CanvasUsableContentResolution {
  return {
    status,
    sourceKind: candidate.sourceKind,
    method: candidate.method,
    provenance: { ...candidate.provenance, method: candidate.method },
    safeFailureCategory:
      status === "empty"
        ? "content_empty"
        : status === "unsupported"
          ? "source_unsupported"
          : status === "inaccessible"
            ? "source_inaccessible"
            : "resolution_failed",
  };
}
