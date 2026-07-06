import type {
  CanvasAnnouncement,
  CanvasAssignment,
  CanvasFile,
  CanvasModule,
  CanvasModuleItem,
  CanvasPageDetail,
} from "@stay-focused/canvas";
import type { DefaultTreeAdapterMap } from "parse5";
import { parseFragment } from "parse5";
import { createHash } from "node:crypto";

import type { Json } from "@stay-focused/db";

import {
  classifyCanvasFileForIngestion,
  ingestionStatusForEligibility,
  normalizeMimeType,
  type CanvasFileIngestionEligibility,
  type CanvasFileIngestionStatus,
} from "@/lib/canvas-file-policy";

export interface CanvasFileInventoryPayload {
  readonly files: readonly CanvasSyncFilePayload[];
  readonly references: readonly CanvasSyncFileReferencePayload[];
  readonly ignoredReferences: CanvasIgnoredFileReferenceCounts;
}

export interface CanvasIgnoredFileReferenceCounts {
  external: number;
  malformed: number;
  wrongCourse: number;
  unknownFile: number;
}

export interface CanvasSyncFilePayload {
  readonly canvas_file_id: string;
  readonly folder_id: string | null;
  readonly display_name: string;
  readonly filename: string | null;
  readonly content_type: string | null;
  readonly size_bytes: number | null;
  readonly locked: boolean | null;
  readonly hidden: boolean | null;
  readonly hidden_for_user: boolean | null;
  readonly visibility_level: string | null;
  readonly media_class: string | null;
  readonly media_entry_id: string | null;
  readonly canvas_created_at: string | null;
  readonly canvas_updated_at: string | null;
  readonly canvas_modified_at: string | null;
  readonly lock_at: string | null;
  readonly unlock_at: string | null;
  readonly metadata_fingerprint: string;
  readonly content_version_fingerprint: string;
  readonly ingestion_eligibility: CanvasFileIngestionEligibility;
  readonly ingestion_status: CanvasFileIngestionStatus;
}

export interface CanvasSyncFileReferencePayload {
  readonly canvas_file_id: string;
  readonly reference_type: CanvasFileReferenceType;
  readonly reference_identity: string;
  readonly canvas_module_id: string | null;
  readonly canvas_module_item_id: string | null;
  readonly canvas_page_url: string | null;
  readonly canvas_assignment_id: string | null;
  readonly canvas_announcement_id: string | null;
}

export type CanvasFileReferenceType =
  | "module_item"
  | "page"
  | "assignment"
  | "announcement"
  | "typed_attachment";

export class CanvasFileNormalizationError extends Error {
  public readonly code = "canvas_file_metadata_invalid";

  public constructor(message: string) {
    super(message);
    this.name = "CanvasFileNormalizationError";
  }
}

export function createCanvasFileInventoryPayload({
  announcements,
  assignments,
  canvasBaseUrl,
  canvasCourseId,
  files,
  moduleItemsByModule,
  pages,
}: {
  readonly announcements: readonly CanvasAnnouncement[];
  readonly assignments: readonly CanvasAssignment[];
  readonly canvasBaseUrl: string;
  readonly canvasCourseId: string;
  readonly files: readonly CanvasFile[];
  readonly moduleItemsByModule: readonly {
    readonly module: CanvasModule;
    readonly items: readonly CanvasModuleItem[];
  }[];
  readonly pages: readonly CanvasPageDetail[];
}): CanvasFileInventoryPayload {
  const mappedFiles = dedupeByIdentity(files.map(mapCanvasFile), (file) => {
    return file.canvas_file_id;
  });
  const knownFileIds = new Set(mappedFiles.map((file) => file.canvas_file_id));
  const referenceAccumulator = createReferenceAccumulator(knownFileIds);

  for (const { items, module } of moduleItemsByModule) {
    for (const item of items) {
      const contentId = nullableIdentifier(item.contentId);
      if (
        item.type.toLowerCase() === "file" &&
        contentId !== null &&
        knownFileIds.has(contentId)
      ) {
        referenceAccumulator.add({
          canvas_assignment_id: null,
          canvas_announcement_id: null,
          canvas_file_id: contentId,
          canvas_module_id: requiredIdentifier(module.id, "module"),
          canvas_module_item_id: requiredIdentifier(item.id, "module item"),
          canvas_page_url: null,
          reference_identity: `module_item:${module.id}:${item.id}`,
          reference_type: "module_item",
        });
      }
    }
  }

  for (const page of pages) {
    const extracted = extractCanvasFileIdsFromHtml({
      canvasBaseUrl,
      canvasCourseId,
      html: page.body,
      knownFileIds,
    });
    referenceAccumulator.addIgnored(extracted.ignored);
    for (const canvasFileId of extracted.fileIds) {
      referenceAccumulator.add({
        canvas_assignment_id: null,
        canvas_announcement_id: null,
        canvas_file_id: canvasFileId,
        canvas_module_id: null,
        canvas_module_item_id: null,
        canvas_page_url: requiredText(page.url, "Page URL"),
        reference_identity: `page:${page.url}:file:${canvasFileId}`,
        reference_type: "page",
      });
    }
  }

  for (const assignment of assignments) {
    const extracted = extractCanvasFileIdsFromHtml({
      canvasBaseUrl,
      canvasCourseId,
      html: assignment.description,
      knownFileIds,
    });
    referenceAccumulator.addIgnored(extracted.ignored);
    for (const canvasFileId of extracted.fileIds) {
      referenceAccumulator.add({
        canvas_assignment_id: requiredIdentifier(assignment.id, "assignment"),
        canvas_announcement_id: null,
        canvas_file_id: canvasFileId,
        canvas_module_id: null,
        canvas_module_item_id: null,
        canvas_page_url: null,
        reference_identity: `assignment:${assignment.id}:file:${canvasFileId}`,
        reference_type: "assignment",
      });
    }
  }

  for (const announcement of announcements) {
    const extracted = extractCanvasFileIdsFromHtml({
      canvasBaseUrl,
      canvasCourseId,
      html: announcement.message,
      knownFileIds,
    });
    referenceAccumulator.addIgnored(extracted.ignored);
    for (const canvasFileId of extracted.fileIds) {
      referenceAccumulator.add({
        canvas_assignment_id: null,
        canvas_announcement_id: requiredIdentifier(
          announcement.id,
          "announcement",
        ),
        canvas_file_id: canvasFileId,
        canvas_module_id: null,
        canvas_module_item_id: null,
        canvas_page_url: null,
        reference_identity: `announcement:${announcement.id}:file:${canvasFileId}`,
        reference_type: "announcement",
      });
    }
  }

  return {
    files: mappedFiles,
    references: referenceAccumulator.references(),
    ignoredReferences: referenceAccumulator.ignored(),
  };
}

export function mapCanvasFile(file: CanvasFile): CanvasSyncFilePayload {
  const canvasFileId = requiredIdentifier(file.id, "file");
  const contentType = normalizeMimeType(file.contentType);
  const displayName = sanitizeDisplayFileName(
    file.displayName ?? file.filename ?? `canvas-file-${canvasFileId}`,
  );
  const normalizedFile = {
    canvas_file_id: canvasFileId,
    folder_id: nullableIdentifier(file.folderId),
    display_name: displayName,
    filename: nullableText(file.filename)
      ? sanitizeDisplayFileName(nullableText(file.filename) ?? "")
      : null,
    content_type: contentType,
    size_bytes: nullableByteSize(file.size),
    locked: file.locked,
    hidden: file.hidden,
    hidden_for_user: file.hiddenForUser,
    visibility_level: nullableText(file.visibilityLevel),
    media_class: nullableText(file.mediaClass),
    media_entry_id: nullableIdentifier(file.mediaEntryId),
    canvas_created_at: nullableDate(file.createdAt),
    canvas_updated_at: nullableDate(file.updatedAt),
    canvas_modified_at: nullableDate(file.modifiedAt),
    lock_at: nullableDate(file.lockAt),
    unlock_at: nullableDate(file.unlockAt),
  };
  const eligibility = classifyCanvasFileForIngestion({
    contentType,
    displayName: normalizedFile.display_name,
    filename: normalizedFile.filename,
    hidden: normalizedFile.hidden,
    hiddenForUser: normalizedFile.hidden_for_user,
    lockAt: normalizedFile.lock_at,
    locked: normalizedFile.locked,
    mediaClass: normalizedFile.media_class,
    mediaEntryId: normalizedFile.media_entry_id,
    size: normalizedFile.size_bytes,
    unlockAt: normalizedFile.unlock_at,
  });

  const payloadWithoutPolicy = {
    ...normalizedFile,
    metadata_fingerprint: fingerprintNormalizedPayload(
      "canvas-file-metadata-v1",
      normalizedFile,
    ),
    content_version_fingerprint: fingerprintNormalizedPayload(
      "canvas-file-content-version-v1",
      {
        canvas_file_id: normalizedFile.canvas_file_id,
        content_type: normalizedFile.content_type,
        canvas_modified_at: normalizedFile.canvas_modified_at,
        canvas_updated_at: normalizedFile.canvas_updated_at,
        size_bytes: normalizedFile.size_bytes,
      },
    ),
  };

  return {
    ...payloadWithoutPolicy,
    ingestion_eligibility: eligibility,
    ingestion_status: ingestionStatusForEligibility(eligibility),
  };
}

function extractCanvasFileIdsFromHtml({
  canvasBaseUrl,
  canvasCourseId,
  html,
  knownFileIds,
}: {
  readonly canvasBaseUrl: string;
  readonly canvasCourseId: string;
  readonly html: string | null;
  readonly knownFileIds: ReadonlySet<string>;
}): {
  readonly fileIds: readonly string[];
  readonly ignored: CanvasIgnoredFileReferenceCounts;
} {
  if (!html) {
    return {
      fileIds: [],
      ignored: emptyIgnoredReferences(),
    };
  }

  let fragment: DefaultTreeAdapterMap["documentFragment"];
  try {
    fragment = parseFragment(html);
  } catch {
    return {
      fileIds: [],
      ignored: { ...emptyIgnoredReferences(), malformed: 1 },
    };
  }

  const canvasOrigin = new URL(canvasBaseUrl).origin;
  const ignored = emptyIgnoredReferences();
  const fileIds = new Set<string>();

  for (const value of collectUrlAttributes(fragment)) {
    const extracted = extractCanvasFileIdFromUrl({
      canvasCourseId,
      canvasOrigin,
      knownFileIds,
      value,
    });
    if (extracted.ok) {
      fileIds.add(extracted.fileId);
    } else {
      ignored[extracted.reason] += 1;
    }
  }

  return {
    fileIds: [...fileIds].sort((left, right) => left.localeCompare(right)),
    ignored,
  };
}

function extractCanvasFileIdFromUrl({
  canvasCourseId,
  canvasOrigin,
  knownFileIds,
  value,
}: {
  readonly canvasCourseId: string;
  readonly canvasOrigin: string;
  readonly knownFileIds: ReadonlySet<string>;
  readonly value: string;
}):
  | { readonly ok: true; readonly fileId: string }
  | {
      readonly ok: false;
      readonly reason: keyof CanvasIgnoredFileReferenceCounts;
    } {
  let parsed: URL;
  try {
    parsed = new URL(value, canvasOrigin);
  } catch {
    return { ok: false, reason: "malformed" };
  }
  parsed.hash = "";
  parsed.search = "";

  if (parsed.origin !== canvasOrigin) {
    return { ok: false, reason: "external" };
  }

  const segments = parsed.pathname
    .split("/")
    .map((segment) => decodeURIComponent(segment))
    .filter(Boolean);
  const apiOffset =
    segments[0] === "api" && segments[1] === "v1" ? 2 : 0;
  const normalizedSegments = segments.slice(apiOffset);

  let fileId: string | null = null;
  if (
    normalizedSegments[0] === "courses" &&
    normalizedSegments[2] === "files" &&
    normalizedSegments[1] !== undefined &&
    normalizedSegments[3] !== undefined
  ) {
    if (normalizedSegments[1] !== canvasCourseId) {
      return { ok: false, reason: "wrongCourse" };
    }
    fileId = nullableIdentifier(normalizedSegments[3]);
  } else if (
    normalizedSegments[0] === "files" &&
    normalizedSegments[1] !== undefined
  ) {
    fileId = nullableIdentifier(normalizedSegments[1]);
  }

  if (!fileId) {
    return { ok: false, reason: "malformed" };
  }
  if (!knownFileIds.has(fileId)) {
    return { ok: false, reason: "unknownFile" };
  }
  return { ok: true, fileId };
}

function collectUrlAttributes(
  root: DefaultTreeAdapterMap["documentFragment"] | DefaultTreeAdapterMap["element"],
): readonly string[] {
  const values: string[] = [];
  function visit(node: DefaultTreeAdapterMap["node"]): void {
    if ("attrs" in node) {
      for (const attr of node.attrs) {
        const name = attr.name.toLowerCase();
        if (
          (name === "href" ||
            name === "src" ||
            name === "data-api-endpoint") &&
          attr.value.trim()
        ) {
          values.push(attr.value.trim());
        }
      }
    }
    if ("childNodes" in node) {
      for (const child of node.childNodes) {
        visit(child);
      }
    }
  }
  visit(root);
  return values;
}

function createReferenceAccumulator(knownFileIds: ReadonlySet<string>): {
  readonly add: (reference: CanvasSyncFileReferencePayload) => void;
  readonly addIgnored: (ignored: CanvasIgnoredFileReferenceCounts) => void;
  readonly ignored: () => CanvasIgnoredFileReferenceCounts;
  readonly references: () => readonly CanvasSyncFileReferencePayload[];
} {
  const references = new Map<string, CanvasSyncFileReferencePayload>();
  const ignored = emptyIgnoredReferences();
  return {
    add(reference) {
      if (!knownFileIds.has(reference.canvas_file_id)) {
        ignored.unknownFile += 1;
        return;
      }
      references.set(
        `${reference.canvas_file_id}:${reference.reference_type}:${reference.reference_identity}`,
        reference,
      );
    },
    addIgnored(nextIgnored) {
      ignored.external += nextIgnored.external;
      ignored.malformed += nextIgnored.malformed;
      ignored.wrongCourse += nextIgnored.wrongCourse;
      ignored.unknownFile += nextIgnored.unknownFile;
    },
    ignored() {
      return { ...ignored };
    },
    references() {
      return [...references.values()].sort((left, right) =>
        `${left.canvas_file_id}:${left.reference_type}:${left.reference_identity}`.localeCompare(
          `${right.canvas_file_id}:${right.reference_type}:${right.reference_identity}`,
        ),
      );
    },
  };
}

function emptyIgnoredReferences(): CanvasIgnoredFileReferenceCounts {
  return {
    external: 0,
    malformed: 0,
    unknownFile: 0,
    wrongCourse: 0,
  };
}

function requiredIdentifier(value: string, label: string): string {
  const normalized = nullableIdentifier(value);
  if (!normalized) {
    throw new CanvasFileNormalizationError(`${label} identifier is required.`);
  }
  return normalized;
}

function nullableIdentifier(value: string | null): string | null {
  return nullableText(value);
}

function requiredText(value: string, label: string): string {
  const normalized = nullableText(value);
  if (!normalized) {
    throw new CanvasFileNormalizationError(`${label} is required.`);
  }
  return normalized;
}

function nullableText(value: string | null): string | null {
  if (value === null) {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function nullableByteSize(value: number | null): number | null {
  if (value === null) {
    return null;
  }
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new CanvasFileNormalizationError("Canvas file size is invalid.");
  }
  return value;
}

function nullableDate(value: string | null): string | null {
  const text = nullableText(value);
  if (text === null) {
    return null;
  }
  const parsed = Date.parse(text);
  if (!Number.isFinite(parsed)) {
    throw new CanvasFileNormalizationError("Canvas date value is invalid.");
  }
  return new Date(parsed).toISOString();
}

function sanitizeDisplayFileName(value: string): string {
  const sanitized = value
    .trim()
    .replace(/[\\/:*?"<>|\0]+/g, "-")
    .replace(/\s+/g, " ")
    .slice(0, 180)
    .trim();
  return sanitized.length > 0 ? sanitized : "canvas-file";
}

function dedupeByIdentity<TItem>(
  items: readonly TItem[],
  identityForItem: (item: TItem) => string,
): readonly TItem[] {
  const sorted = [...items].sort((left, right) => {
    const leftIdentity = identityForItem(left);
    const rightIdentity = identityForItem(right);
    if (leftIdentity !== rightIdentity) {
      return leftIdentity.localeCompare(rightIdentity);
    }
    return JSON.stringify(left).localeCompare(JSON.stringify(right));
  });
  const seen = new Set<string>();
  const deduped: TItem[] = [];
  for (const item of sorted) {
    const identity = identityForItem(item);
    if (!seen.has(identity)) {
      seen.add(identity);
      deduped.push(item);
    }
  }
  return deduped;
}

function fingerprintNormalizedPayload(
  version: string,
  payload: Readonly<Record<string, Json | undefined>>,
): string {
  return createHash("sha256")
    .update(version)
    .update("\n")
    .update(canonicalSerialize(payload))
    .digest("hex");
}

function canonicalSerialize(value: unknown): string {
  return JSON.stringify(canonicalize(value));
}

function canonicalize(value: unknown): unknown {
  if (value === undefined) {
    return ["undefined"];
  }
  if (value === null) {
    return ["null"];
  }
  if (typeof value === "string") {
    return ["string", value];
  }
  if (typeof value === "number") {
    return ["number", value];
  }
  if (typeof value === "boolean") {
    return ["boolean", value];
  }
  if (Array.isArray(value)) {
    return ["array", value.map(canonicalize)];
  }
  if (typeof value === "object" && value !== null) {
    const record = value as Readonly<Record<string, unknown>>;
    return [
      "object",
      Object.keys(record)
        .sort((left, right) => left.localeCompare(right))
        .map((key) => [key, canonicalize(record[key])]),
    ];
  }
  return ["unsupported", String(value)];
}
