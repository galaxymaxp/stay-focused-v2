export const OFFICE_MIME = {
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
} as const;

export const MANUAL_UPLOAD_LIMITS = {
  "application/pdf": 10 * 1024 * 1024,
  "image/png": 5 * 1024 * 1024,
  "image/jpeg": 5 * 1024 * 1024,
  [OFFICE_MIME.docx]: 10 * 1024 * 1024,
  [OFFICE_MIME.pptx]: 10 * 1024 * 1024,
} as const;
export type ManualUploadMime = keyof typeof MANUAL_UPLOAD_LIMITS;
export const MANUAL_UPLOAD_ACCEPT = Object.keys(MANUAL_UPLOAD_LIMITS).join(",");
export const LEGACY_OFFICE_MESSAGE = "Legacy .doc and .ppt files aren't supported. Save as .docx or .pptx and try again.";
export const UNREADABLE_MANUAL_FILE_MESSAGE = "We couldn't read text from this file";

export function isManualUploadMime(value: unknown): value is ManualUploadMime {
  return typeof value === "string" && Object.hasOwn(MANUAL_UPLOAD_LIMITS, value);
}

export function manualUploadKind(mime: ManualUploadMime): "pdf" | "image" | "docx" | "pptx" {
  return mime === OFFICE_MIME.docx ? "docx" : mime === OFFICE_MIME.pptx ? "pptx" : mime === "application/pdf" ? "pdf" : "image";
}

/** Picker MIME may be absent; the server always validates the actual bytes. */
export function manualUploadMime(mime: string | undefined, name: string): ManualUploadMime | null {
  if (/\.(doc|ppt)$/i.test(name)) return null;
  if (isManualUploadMime(mime)) return mime;
  if (mime && mime !== "application/octet-stream") return null;
  const extension = name.toLowerCase().split(".").at(-1);
  return extension === "docx" ? OFFICE_MIME.docx : extension === "pptx" ? OFFICE_MIME.pptx : extension === "pdf" ? "application/pdf" : null;
}
