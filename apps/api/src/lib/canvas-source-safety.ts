export function sanitizeCanvasPreviewText(value: string): string {
  return value
    .replace(/https?:\/\/[^\s)>\]]+/gi, "[link removed]")
    .replace(/\bBearer\s+[A-Za-z0-9._~+/=-]+/gi, "Bearer [redacted]")
    .replace(/\bsk-[A-Za-z0-9_-]{10,}\b/g, "[redacted]")
    .replace(/\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g, "[redacted]")
    .replace(/\b(verifier|access_token|token|signature|expires)=\S+/gi, "$1=[redacted]")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function sanitizeCanvasTitleText(value: string): string {
  return sanitizeCanvasPreviewText(value).replace(/\s+/g, " ").trim();
}
