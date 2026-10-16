import { describe, expect, it, vi } from "vitest";
import { OFFICE_MIME, LEGACY_OFFICE_MESSAGE } from "@stay-focused/shared";
import { chooseManualDocument, mapManualDocument } from "./manualDocument";
import { manualSourceNeedsEdit } from "./reviewerSourceFlow";
const picker = vi.hoisted(() => vi.fn());
vi.mock("expo-document-picker", () => ({ getDocumentAsync: picker }));
describe("manual files and source flow", () => {
  it.each(["docx", "pptx"] as const)("picks %s without an editable-text stage", async kind => {
    picker.mockResolvedValue({ canceled: false, assets: [{ name: `notes.${kind}`, uri: "file:notes", size: 50 }] });
    expect(await chooseManualDocument()).toMatchObject({ mimeType: OFFICE_MIME[kind] });
    expect(picker).toHaveBeenCalledWith(expect.objectContaining({ type: ["application/pdf", OFFICE_MIME.docx, OFFICE_MIME.pptx] }));
    expect(manualSourceNeedsEdit(kind)).toBe(false);
  });
  it("files/photos skip editing while paste retains it", () => {
    for (const mode of ["pdf", "image", "docx", "pptx"] as const) expect(manualSourceNeedsEdit(mode)).toBe(false);
    expect(manualSourceNeedsEdit("paste")).toBe(true);
  });
  it.each(["doc", "ppt"])("explains unsupported legacy %s", extension => {
    expect(() => mapManualDocument({ name: `notes.${extension}`, uri: "file:notes", size: 10, lastModified: 0 })).toThrow(LEGACY_OFFICE_MESSAGE);
  });
});
