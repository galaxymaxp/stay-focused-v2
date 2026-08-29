import type {
  ReviewerSourceStatusAction,
  ReviewerSourceStatusItem,
  ReviewerSourceStatusPayload,
  SavedReviewerDetail,
  SavedReviewerSourceProvenanceSummary,
  SavedReviewerSummary,
} from "../../services/reviewerLibraryApi";
import {
  describeReviewerSourceMode,
  type ReviewerReaderContext,
} from "../reviewer/reviewerReaderPresentation";

/**
 * Student-facing presentation for the Study Library.
 *
 * A saved reviewer record is narrower than it looks. The list endpoint returns
 * only `title`, `sourceMetadata` (`sourceMode`, `sourceCharacterCount`, an
 * optional `pdfPageCount` and `sourceLabel`), `sectionCount`, `createdAt`, and
 * `updatedAt`. There is no course, no grounding status, and no selected-block
 * count until a reviewer is opened, so nothing here manufactures one: a field
 * the record does not carry is left out rather than filled with `Unknown` or a
 * zero.
 *
 * `createdAt` is the moment the reviewer was saved and is the timestamp the
 * student is shown. `updatedAt` moves when a reviewer is renamed, which answers
 * no question a student is asking of a shelf, so it is not displayed.
 *
 * Source wording is deliberately shared with the Reader through
 * `describeReviewerSourceMode`, so a reviewer reads as `Canvas` in the list and
 * `Canvas` again once it is open.
 */

const UNTITLED_SAVED_REVIEWER = "Untitled reviewer";
const NO_SECTIONS = "No sections";

export interface SavedReviewerCardPresentation {
  readonly title: string;
  /** Where it came from, e.g. `Week 3 announcement · Canvas`. */
  readonly sourceLine: string | null;
  /** How much there is and when it was kept, e.g. `4 sections · Saved Aug 29`. */
  readonly scaleLine: string;
  readonly openAccessibilityLabel: string;
  readonly deleteAccessibilityLabel: string;
}

export interface SavedReviewerProvenanceDetail {
  readonly label: string;
  readonly value: string;
}

export function savedReviewerTitle(reviewer: SavedReviewerSummary): string {
  return withFallback(reviewer.title, UNTITLED_SAVED_REVIEWER);
}

/**
 * One compact line naming the source a reviewer was made from. The stored
 * label leads because it is what the student recognises; the source kind
 * follows, and is dropped when the label already says the same thing.
 */
export function describeSavedReviewerSource(
  reviewer: SavedReviewerSummary,
): string | null {
  const label = trim(reviewer.sourceMetadata.sourceLabel);
  const kind = describeReviewerSourceMode(reviewer.sourceMetadata.sourceMode);

  const parts: string[] = [];
  if (kind) {
    parts.push(kind);
  }
  if (label && !(kind && sameText(kind, label))) {
    parts.unshift(label);
  }

  return parts.length > 0 ? parts.join(" · ") : null;
}

/**
 * How much material the saved reviewer holds. The PDF page count is the only
 * extra scale figure a saved record actually stores, and it appears only for
 * the reviewers that carry it.
 */
export function describeSavedReviewerScale(
  reviewer: SavedReviewerSummary,
): string {
  const parts = [describeSectionCount(reviewer.sectionCount)];
  const pageCount = reviewer.sourceMetadata.pdfPageCount;

  if (isPositiveCount(pageCount)) {
    parts.push(`from ${countLabel(Math.floor(pageCount), "page", "pages")}`);
  }

  return parts.join(" · ");
}

/**
 * The date a reviewer was saved, without the year when it is the current one.
 * An unparseable timestamp reports nothing rather than leaking its raw value.
 */
export function formatSavedReviewerDate(
  value: string,
  now: Date = new Date(),
): string | null {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date.toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    ...(date.getFullYear() === now.getFullYear()
      ? {}
      : { year: "numeric" as const }),
  });
}

export function describeSavedReviewerSavedAt(
  reviewer: SavedReviewerSummary,
  now: Date = new Date(),
): string | null {
  const formatted = formatSavedReviewerDate(reviewer.createdAt, now);
  return formatted ? `Saved ${formatted}` : null;
}

export function describeSavedReviewerCount(count: number): string {
  return countLabel(count, "saved reviewer", "saved reviewers");
}

export function presentSavedReviewer(
  reviewer: SavedReviewerSummary,
  now: Date = new Date(),
): SavedReviewerCardPresentation {
  const title = savedReviewerTitle(reviewer);
  const savedAt = describeSavedReviewerSavedAt(reviewer, now);
  const scaleParts = [describeSavedReviewerScale(reviewer)];
  if (savedAt) {
    scaleParts.push(savedAt);
  }

  return {
    title,
    sourceLine: describeSavedReviewerSource(reviewer),
    scaleLine: scaleParts.join(" · "),
    openAccessibilityLabel: `Open reviewer ${title}`,
    deleteAccessibilityLabel: `Delete reviewer ${title}`,
  };
}

/**
 * Reader context for a saved reviewer, built only from fields the saved record
 * actually carries. A reviewer saved without Canvas provenance simply passes
 * fewer fields; it is never given a manufactured source.
 */
export function savedReviewerReaderContext(
  reviewer: SavedReviewerDetail,
): ReviewerReaderContext {
  const provenance = reviewer.sourceProvenance;
  const sourceLabel =
    trim(reviewer.sourceMetadata.sourceLabel) ||
    trim(provenance?.sourceTitle) ||
    null;

  return {
    sourceLabel,
    sourceMode: reviewer.sourceMetadata.sourceMode,
    selectedBlockCount: provenance?.selectedBlockCount ?? null,
  };
}

/**
 * Snapshot identifiers and parser versions. This is debugging material, not
 * study material: it stays behind a disclosure so reopening a reviewer leads
 * with the document. The selected-block count is deliberately absent because
 * the Reader already reports it in student language.
 */
export function describeSavedReviewerTechnicalProvenance(
  summary: SavedReviewerSourceProvenanceSummary,
): readonly SavedReviewerProvenanceDetail[] {
  return [
    {
      label: "Snapshot",
      value: summary.sourceSnapshotId,
    },
    {
      label: "Sources",
      value: countLabel(summary.sourceCount, "source", "sources"),
    },
    {
      label: "Source edited",
      value: summary.wasEdited ? "Yes" : "No",
    },
    {
      label: "Generated",
      value: formatSavedReviewerDate(summary.generatedAt) ?? summary.generatedAt,
    },
    {
      label: "Parsers",
      value: formatVersionList(summary.parserVersions),
    },
    {
      label: "OCR",
      value: formatVersionList(summary.ocrVersions),
    },
  ];
}

/**
 * Overall source health followed by the counts that are actually non-zero. The
 * previous form listed all six buckets including the zeros, which read as a
 * database row rather than an answer.
 */
export function describeSourceStatusSummary(
  status: ReviewerSourceStatusPayload,
): string {
  const parts = [
    describeCount(status.counts.current, "current"),
    describeCount(status.counts.changed, "changed"),
    describeCount(status.counts.unavailable, "unavailable"),
    describeCount(status.counts.unsupported, "unsupported"),
    describeCount(status.counts.missingAfterSync, "missing after sync"),
    describeCount(status.counts.unknown, "unknown"),
  ].filter((part): part is string => part !== null);

  const overall = describeSourceOverallStatus(status.overallStatus);
  return parts.length > 0 ? `${overall} · ${parts.join(", ")}` : overall;
}

export function describeSourceOverallStatus(
  status: ReviewerSourceStatusPayload["overallStatus"],
): string {
  switch (status) {
    case "current":
      return "Sources current";
    case "changed":
      return "Changes detected";
    case "attention_required":
      return "Sources need attention";
    case "unknown":
      return "Source status unknown";
  }
}

export function describeSourceReadiness(
  readiness: ReviewerSourceStatusPayload["regenerationReadiness"],
): string {
  switch (readiness) {
    case "ready_current":
      return "Ready to regenerate from current sources";
    case "ready_with_changes":
      return "Ready to regenerate after reviewing the detected changes";
    case "blocked_missing_sources":
      return "Cannot regenerate: sources are missing";
    case "blocked_unavailable_sources":
      return "Cannot regenerate: sources are unavailable";
    case "blocked_unsupported_sources":
      return "Cannot regenerate: sources are unsupported";
    case "unknown":
      return "Regeneration readiness is unknown";
  }
}

export function describeSourceStatusActions(
  actions: readonly ReviewerSourceStatusAction[],
): string | null {
  if (actions.length === 0) {
    return null;
  }

  return `Next action: ${actions.map(describeSourceStatusAction).join(", ")}`;
}

export function describeSourceStatusAction(
  action: ReviewerSourceStatusAction,
): string {
  switch (action) {
    case "prepare_updated_file":
      return "prepare updated file";
    case "sync_canvas_course":
      return "sync Canvas course";
    case "choose_replacement_source":
      return "choose replacement source";
    case "check_canvas_access":
      return "check Canvas access";
    case "unsupported_source_type":
      return "unsupported source type";
    case "status_unknown":
      return "status unknown";
  }
}

export function describeSourceStatusItem(
  item: ReviewerSourceStatusItem,
): string {
  const kind = item.fileKind ? ` ${item.fileKind}` : "";
  return `${describeSourceItemStatus(item.status)} ${describeSourceItemType(
    item.sourceType,
  )}${kind} · ${item.message}`;
}

function describeSourceItemStatus(
  status: ReviewerSourceStatusItem["status"],
): string {
  switch (status) {
    case "current":
      return "Current";
    case "changed":
      return "Changed";
    case "unavailable":
      return "Unavailable";
    case "unsupported":
      return "Unsupported";
    case "missing_after_sync":
      return "Missing after sync";
    case "unknown":
      return "Unknown";
  }
}

function describeSourceItemType(
  sourceType: ReviewerSourceStatusItem["sourceType"],
): string {
  switch (sourceType) {
    case "page":
      return "page";
    case "assignment":
      return "assignment";
    case "announcement":
      return "announcement";
    case "file":
      return "file";
  }
}

function describeSectionCount(sectionCount: number): string {
  if (!isPositiveCount(sectionCount)) {
    return NO_SECTIONS;
  }

  return countLabel(Math.floor(sectionCount), "section", "sections");
}

function describeCount(count: number, label: string): string | null {
  return count > 0 ? `${count} ${label}` : null;
}

function formatVersionList(values: readonly string[]): string {
  return values.length > 0 ? values.join(", ") : "None recorded";
}

function isPositiveCount(value: number | undefined): value is number {
  return typeof value === "number" && Number.isFinite(value) && value > 0;
}

function countLabel(count: number, singular: string, plural: string): string {
  return `${count} ${count === 1 ? singular : plural}`;
}

function trim(value: string | null | undefined): string {
  return typeof value === "string" ? value.trim() : "";
}

function withFallback(value: string, fallback: string): string {
  const trimmed = trim(value);
  return trimmed.length > 0 ? trimmed : fallback;
}

function sameText(left: string, right: string): boolean {
  return normalize(left) === normalize(right);
}

function normalize(value: string): string {
  return value.trim().replace(/\s+/g, " ").toLowerCase();
}
