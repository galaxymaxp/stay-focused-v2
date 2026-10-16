import { zipSync, strToU8 } from "fflate";
import { describe, expect, it } from "vitest";
import { validateManualOfficeBytes } from "./manual-upload-validation";
describe("manual Office byte admission", () => {
  it("requires ZIP and the expected package parts, not a renamed non-Office file", () => {
    expect(validateManualOfficeBytes(strToU8("%PDF fake"), "docx")).toBe(false);
    expect(validateManualOfficeBytes(zipSync({ "notes.txt": strToU8("notes") }), "docx")).toBe(false);
    const docx = zipSync({ "word/document.xml": strToU8("<document/>") });
    expect(validateManualOfficeBytes(docx, "docx")).toBe(true);
    expect(validateManualOfficeBytes(docx, "pptx")).toBe(false);
    expect(validateManualOfficeBytes(zipSync({ "ppt/presentation.xml": strToU8("<p/>"),
      "ppt/_rels/presentation.xml.rels": strToU8("<r/>"), "ppt/slides/slide1.xml": strToU8("<s/>") }), "pptx")).toBe(true);
  });
  it("rejects active content, path traversal, damaged archives and oversize input", () => {
    for (const name of ["word/vbaProject.bin", "../word/document.xml"]) {
      expect(validateManualOfficeBytes(zipSync({ "word/document.xml": strToU8("<d/>"), [name]: strToU8("x") }), "docx")).toBe(false);
    }
    expect(validateManualOfficeBytes(new Uint8Array([80, 75, 3, 4]), "docx")).toBe(false);
    expect(validateManualOfficeBytes(new Uint8Array(10 * 1024 * 1024 + 1), "pptx")).toBe(false);
  });
});
