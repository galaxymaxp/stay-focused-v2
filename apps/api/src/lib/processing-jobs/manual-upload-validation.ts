import { unzipSync } from "fflate";
import { CANVAS_FILE_MAX_SINGLE_BYTES } from "../canvas-file-policy";

/** Bounded ZIP inspection: renamed archives and wrong Office packages fail closed. */
export function validateManualOfficeBytes(bytes: Uint8Array, kind: "docx" | "pptx"): boolean {
  if (!bytes.length || bytes.length > CANVAS_FILE_MAX_SINGLE_BYTES ||
      bytes[0] !== 0x50 || bytes[1] !== 0x4b || bytes[2] !== 3 || bytes[3] !== 4) return false;
  let entries = 0;
  let expanded = 0;
  const names = new Set<string>();
  try {
    unzipSync(bytes, { filter(entry) {
      if (++entries > 2000 || names.has(entry.name) || /(^\/|\\|(^|\/)\.\.(\/|$))/.test(entry.name) ||
          /vbaProject|activeX|embeddings/i.test(entry.name)) throw new Error("invalid_office");
      names.add(entry.name);
      expanded += entry.originalSize;
      if (expanded > 40_000_000) throw new Error("office_too_large");
      return false;
    } });
    return kind === "docx" ? names.has("word/document.xml") :
      names.has("ppt/presentation.xml") && names.has("ppt/_rels/presentation.xml.rels") &&
      [...names].some(name => /^ppt\/slides\/slide\d+\.xml$/.test(name));
  } catch { return false; }
}
