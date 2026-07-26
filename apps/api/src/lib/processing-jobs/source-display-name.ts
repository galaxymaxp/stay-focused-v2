const MAX_SOURCE_DISPLAY_NAME_CHARS = 180;

export function readUploadDisplayName(
  value: FormDataEntryValue | null,
  fallback: string,
): string {
  const explicit = typeof value === "string" ? value : "";
  return sanitizeSourceDisplayName(explicit || fallback);
}

export function sanitizeSourceDisplayName(value: string): string {
  const normalized = value
    .replace(/[\u0000-\u001f\u007f]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return (normalized || "Source").slice(0, MAX_SOURCE_DISPLAY_NAME_CHARS);
}
