export type BoundedTextResult =
  | { readonly ok: true; readonly text: string }
  | { readonly ok: false; readonly reason: "too_large" | "invalid_encoding" };

/** Read at most maximumBytes, counting wire bytes before decoding or parsing. */
export async function readBoundedText(
  request: Request,
  maximumBytes: number,
): Promise<BoundedTextResult> {
  const declared = Number(request.headers.get("content-length"));
  if (Number.isFinite(declared) && declared > maximumBytes) {
    return { ok: false, reason: "too_large" };
  }
  // Request.text() returns an empty string for a null body.
  const reader = request.body?.getReader();
  if (!reader) return { ok: true, text: "" };

  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > maximumBytes) {
        // Cancellation failures must not change the caller's oversize contract.
        try { await reader.cancel(); } catch { /* Already rejected. */ }
        return { ok: false, reason: "too_large" };
      }
      chunks.push(value);
    }
    const bytes = new Uint8Array(size);
    let offset = 0;
    for (const chunk of chunks) {
      bytes.set(chunk, offset);
      offset += chunk.byteLength;
    }
    try {
      return { ok: true, text: new TextDecoder("utf-8", { fatal: true }).decode(bytes) };
    } catch {
      return { ok: false, reason: "invalid_encoding" };
    }
  } finally {
    reader.releaseLock();
  }
}
