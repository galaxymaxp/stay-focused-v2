import { describe, expect, it } from "vitest";
import { isManualUploadMime, manualUploadKind, manualUploadMime, OFFICE_MIME, MANUAL_UPLOAD_LIMITS } from "./manual-reviewer-upload";
describe("manual reviewer upload policy", () => {
  it.each(["docx", "pptx"] as const)("accepts %s including missing picker MIME at the Canvas Office cap", kind => {
    expect(isManualUploadMime(OFFICE_MIME[kind])).toBe(true);
    expect(manualUploadMime(undefined, `notes.${kind}`)).toBe(OFFICE_MIME[kind]);
    expect(manualUploadKind(OFFICE_MIME[kind])).toBe(kind);
    expect(MANUAL_UPLOAD_LIMITS[OFFICE_MIME[kind]]).toBe(10 * 1024 * 1024);
  });
  it.each(["doc", "ppt"])("rejects legacy %s even with a modern MIME", extension => {
    expect(manualUploadMime(OFFICE_MIME.docx, `notes.${extension}`)).toBeNull();
  });
  it("rejects unknown MIME and preserves PDF/photo policies", () => {
    expect(manualUploadMime("text/html", "notes.docx")).toBeNull();
    expect(isManualUploadMime("__proto__")).toBe(false);
    expect(manualUploadKind("application/pdf")).toBe("pdf");
    expect(manualUploadKind("image/jpeg")).toBe("image");
  });
});
