import type {
  CanvasAssignment,
  CanvasFile,
  CanvasModuleItem,
  CanvasPageDetail,
} from "@stay-focused/canvas";

import { isMeaningfulCanvasContent, normalizeCanvasHtmlToText } from "@/lib/canvas-content-normalization";
import { classifyCanvasFileForIngestion, normalizeMimeType } from "@/lib/canvas-file-policy";

export type CanvasModuleMaterialClassification =
  | "SUPPORTED_LEARNER_MATERIAL"
  | "UNSUPPORTED_LEARNER_MATERIAL"
  | "TASK_METADATA"
  | "NAVIGATION_ONLY"
  | "EXTERNAL_RESOURCE"
  | "INACCESSIBLE"
  | "EMPTY"
  | "UNKNOWN";

export type CanvasUnsupportedFormat = "DOCX" | "PPTX";

export interface CanvasModuleMaterialResult {
  readonly classification: CanvasModuleMaterialClassification;
  readonly unsupportedFormat: CanvasUnsupportedFormat | null;
}

export function classifyCanvasModuleItem({
  assignment,
  file,
  item,
  page,
  resolution,
}: {
  readonly assignment?: CanvasAssignment;
  readonly file?: CanvasFile;
  readonly item: CanvasModuleItem;
  readonly page?: CanvasPageDetail;
  readonly resolution?: "resolved" | "inaccessible" | "missing";
}): CanvasModuleMaterialResult {
  if (resolution === "inaccessible" || resolution === "missing") {
    return result("INACCESSIBLE");
  }

  switch (item.type) {
    case "File":
      return file ? classifyFile(file) : result("INACCESSIBLE");
    case "Page": {
      if (!page) return result("INACCESSIBLE");
      const text = normalizeCanvasHtmlToText(page.body);
      return result(
        isMeaningfulCanvasContent(text) ? "SUPPORTED_LEARNER_MATERIAL" : "EMPTY",
      );
    }
    case "Assignment":
      return assignment ? classifyAssignment(assignment) : result("TASK_METADATA");
    case "Discussion":
    case "Quiz":
      return result("TASK_METADATA");
    case "ExternalUrl":
    case "ExternalTool":
      return result("EXTERNAL_RESOURCE");
    case "SubHeader":
      return result("NAVIGATION_ONLY");
    default:
      return result("UNKNOWN");
  }
}

function classifyAssignment(
  assignment: CanvasAssignment,
): CanvasModuleMaterialResult {
  const description = normalizeCanvasHtmlToText(assignment.description);
  if (isMeaningfulCanvasContent(description)) {
    return result("SUPPORTED_LEARNER_MATERIAL");
  }

  const attachments = assignment.attachments ?? [];
  const supported = attachments.find(
    (attachment) =>
      classifyCanvasFileForIngestion(attachment) === "eligible_document" ||
      classifyCanvasFileForIngestion(attachment) === "eligible_image",
  );
  if (supported) return result("SUPPORTED_LEARNER_MATERIAL");

  const unsupported = attachments
    .map(unsupportedFormatForFile)
    .find((format): format is CanvasUnsupportedFormat => format !== null);
  if (unsupported) {
    return {
      classification: "UNSUPPORTED_LEARNER_MATERIAL",
      unsupportedFormat: unsupported,
    };
  }
  return result("TASK_METADATA");
}

function classifyFile(file: CanvasFile): CanvasModuleMaterialResult {
  const unsupportedFormat = unsupportedFormatForFile(file);
  if (unsupportedFormat) {
    return {
      classification: "UNSUPPORTED_LEARNER_MATERIAL",
      unsupportedFormat,
    };
  }
  const eligibility = classifyCanvasFileForIngestion(file);
  if (eligibility === "eligible_document" || eligibility === "eligible_image") {
    return result("SUPPORTED_LEARNER_MATERIAL");
  }
  if (eligibility.startsWith("blocked_") || eligibility === "blocked_unavailable") {
    return result("INACCESSIBLE");
  }
  return result("UNSUPPORTED_LEARNER_MATERIAL");
}

function unsupportedFormatForFile(
  file: CanvasFile,
): CanvasUnsupportedFormat | null {
  const mime = normalizeMimeType(file.contentType);
  const name = (file.filename ?? file.displayName ?? "").trim().toLowerCase();
  if (
    mime === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    name.endsWith(".docx")
  ) {
    return "DOCX";
  }
  if (
    mime === "application/vnd.openxmlformats-officedocument.presentationml.presentation" ||
    name.endsWith(".pptx")
  ) {
    return "PPTX";
  }
  return null;
}

function result(
  classification: CanvasModuleMaterialClassification,
): CanvasModuleMaterialResult {
  return { classification, unsupportedFormat: null };
}
