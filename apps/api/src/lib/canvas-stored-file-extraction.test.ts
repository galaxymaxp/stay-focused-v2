import type { CanvasFileRow, Database } from "@stay-focused/db";
import {
  OcrProviderError,
  type OcrInput,
  type OcrProvider,
  type OcrResult,
} from "@stay-focused/ocr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createHash } from "node:crypto";
import { PDFDocument, StandardFonts } from "pdf-lib";
import { zipSync, strToU8 } from "fflate";
import { OFFICE_MIME } from './activity-maker/office-extraction';
import { createTaskSpecification } from './activity-maker/generation';
import { describe, expect, it } from "vitest";

import {
  CANVAS_SOURCE_FILE_BUCKET,
  safeObjectKeyForCanvasFile,
} from "@/lib/canvas-file-policy";
import { DOCUMENT_MAX_PDF_PAGES } from "@/lib/ocr/upload-policy";

import { extractPreparedCanvasFileText } from "./canvas-stored-file-extraction";

const USER_ID = "00000000-0000-4000-8000-000000000001";
const CONNECTION_ID = "00000000-0000-4000-8000-000000000002";
const COURSE_ID = "00000000-0000-4000-8000-000000000003";
const FILE_ID = "44444444-4444-4444-8444-444444444444";
const NOW = "2026-07-07T00:00:00.000Z";
const PNG_BYTES = new Uint8Array([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x66, 0x69, 0x78,
]);
const JPEG_BYTES = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0x66, 0x69, 0x78]);

describe("Canvas stored file extraction", () => {
  it.each(['native PDF','scanned PDF','PNG','JPEG'])('%s instructions survive private extraction into exact task requirements',async kind=>{
    const instructions='Provide exactly three reasons. No conclusion required. Use only the supplied biology reading. Explain diffusion using source evidence and keep each requested reason distinct.';
    let bytes:Uint8Array;
    const contentType=kind.includes('PDF')?'application/pdf':kind==='PNG'?'image/png':'image/jpeg';
    if(kind==='native PDF'){
      const pdf=await PDFDocument.create();const font=await pdf.embedFont(StandardFonts.Helvetica);
      const page=pdf.addPage([800,500]);page.drawText(instructions,{x:30,y:400,size:8,font});
      bytes=await pdf.save();
    }else bytes=kind==='scanned PDF'?await makePdfBytes(1):kind==='PNG'?PNG_BYTES:JPEG_BYTES;
    const filename=kind.includes('PDF')?'instructions.pdf':kind==='PNG'?'instructions.png':'instructions.jpg';
    const file=makeReadyFile({bytes,contentType,filename,displayName:filename});const provider=createFakeOcrProvider(instructions);
    const result=await extract(file,createStorageClient([[file.storage_object_key??'',bytes]]).client,provider);
    expect(result.ok).toBe(true);if(!result.ok)throw new Error('Expected instructions');
    const spec=createTaskSpecification('activity','Biology',[{id:'instructions',title:'Instructions',text:result.value.text,role:'instructions',materialId:null}]);
    expect(spec.wordOrLengthRequirements.items).toBe(3);expect(spec.constraints).toEqual(['No conclusion']);
    expect(provider.calls).toHaveLength(kind==='native PDF'?0:1);
  });
  it('extracts an owned DOCX template through private Storage into task structure without OCR',async()=>{
    const bytes=zipSync({'word/document.xml':strToU8('<w:document xmlns:w="urn:w"><w:body><w:p><w:pPr><w:pStyle w:val="Heading1"/></w:pPr><w:r><w:t>Observations</w:t></w:r></w:p><w:p><w:pPr><w:pStyle w:val="Heading1"/></w:pPr><w:r><w:t>Analysis</w:t></w:r></w:p></w:body></w:document>')});
    const file=makeReadyFile({bytes,contentType:OFFICE_MIME.docx,displayName:'Lab template.docx',filename:'lab-template.docx'});
    const storage=createStorageClient([[file.storage_object_key??'',bytes]]);
    const result=await extract(file,storage.client);
    expect(result.ok).toBe(true);
    if(!result.ok)throw new Error('Expected Office extraction');
    const spec=createTaskSpecification('canvas:activity','Lab report',[{id:'instructions',title:'Lab',text:'Use the attached template.',role:'instructions',materialId:null},{id:'template',title:'Lab template',text:result.value.text,role:'template',materialId:null}]);
    expect(spec.requiredOrder).toEqual(['Observations','Analysis']);
    expect(storage.calls).toHaveLength(1);
  });
  it("extracts ready PNG files through private Storage and fake OCR", async () => {
    const file = makeReadyFile({
      bytes: PNG_BYTES,
      contentType: "image/png",
      displayName: "Fictional diagram.png",
      filename: "fictional-diagram.png",
    });
    const storage = createStorageClient([[file.storage_object_key ?? "", PNG_BYTES]]);
    const provider = createFakeOcrProvider("Fictional PNG OCR text.");

    const result = await extract(file, storage.client, provider);

    expect(result).toMatchObject({
      ok: true,
      value: {
        fileKind: "image",
        text: "Fictional PNG OCR text.",
      },
    });
    expect(storage.calls).toEqual([
      {
        bucket: CANVAS_SOURCE_FILE_BUCKET,
        key: file.storage_object_key,
      },
    ]);
    expect(provider.calls).toHaveLength(1);
    expect(provider.calls[0]).toMatchObject({
      kind: "image",
      mimeType: "image/png",
    });
  });

  it("extracts ready JPEG files through the same image OCR boundary", async () => {
    const file = makeReadyFile({
      bytes: JPEG_BYTES,
      contentType: "image/jpeg",
      displayName: "Fictional board.jpg",
      filename: "fictional-board.jpg",
    });
    const storage = createStorageClient([[file.storage_object_key ?? "", JPEG_BYTES]]);
    const provider = createFakeOcrProvider("Fictional JPEG OCR text.");

    const result = await extract(file, storage.client, provider);

    expect(result).toMatchObject({
      ok: true,
      value: {
        fileKind: "image",
        text: "Fictional JPEG OCR text.",
      },
    });
    expect(provider.calls[0]).toMatchObject({
      kind: "image",
      mimeType: "image/jpeg",
    });
  });

  it("extracts a ready one-page PDF and reports page count", async () => {
    const bytes = await makePdfBytes(1);
    const file = makeReadyFile({
      bytes,
      contentType: "application/pdf",
      displayName: "Fictional handout.pdf",
      filename: "fictional-handout.pdf",
    });
    const storage = createStorageClient([[file.storage_object_key ?? "", bytes]]);
    const provider = createFakeOcrProvider((input) =>
      input.kind === "pdf" ? `Page ${input.requestedPages[0]} text.` : "",
    );

    const result = await extract(file, storage.client, provider);

    expect(result).toMatchObject({
      ok: true,
      value: {
        fileKind: "pdf",
        pageCount: 1,
        text: "Page 1 text.",
      },
    });
    expect(provider.calls[0]).toMatchObject({
      kind: "pdf",
      mimeType: "application/pdf",
      requestedPages: [1],
    });
  });

  it("extracts a ready UTF-8 text file without configuring OCR", async () => {
    const bytes = new TextEncoder().encode("Fictional study notes.\n\nSecond section.");
    const file = makeReadyFile({
      bytes,
      contentType: "text/plain",
      displayName: "Fictional notes.txt",
      filename: "fictional-notes.txt",
    });
    const storage = createStorageClient([[file.storage_object_key ?? "", bytes]]);

    const result = await extract(file, storage.client);

    expect(result).toMatchObject({
      ok: true,
      value: {
        fileKind: "text",
        text: "Fictional study notes.\n\nSecond section.",
      },
    });
  });

  it("preserves requested PDF page order for multi-page OCR", async () => {
    const bytes = await makePdfBytes(3);
    const file = makeReadyFile({
      bytes,
      contentType: "application/pdf",
      displayName: "Fictional packet.pdf",
      filename: "fictional-packet.pdf",
    });
    const storage = createStorageClient([[file.storage_object_key ?? "", bytes]]);
    const provider = createFakeOcrProvider((input) =>
      input.kind === "pdf"
        ? input.requestedPages.map((page) => `Page ${page} text.`).join("\n\n")
        : "",
    );

    const result = await extract(file, storage.client, provider);

    expect(result).toMatchObject({
      ok: true,
      value: {
        pageCount: 3,
        text: "Page 1 text.\n\nPage 2 text.\n\nPage 3 text.",
      },
    });
  });

  it.each([
    [
      "missing Storage object",
      () => ({ file: makeReadyFile({ bytes: PNG_BYTES, contentType: "image/png" }) }),
      "canvas_source_stored_file_missing",
      1,
    ],
    [
      "unexpected bucket",
      () => ({
        file: {
          ...makeReadyFile({ bytes: PNG_BYTES, contentType: "image/png" }),
          storage_bucket: "unexpected-bucket",
        },
      }),
      "canvas_source_stored_file_corrupt",
      0,
    ],
    [
      "unsafe object-key prefix",
      () => ({
        file: {
          ...makeReadyFile({ bytes: PNG_BYTES, contentType: "image/png" }),
          storage_object_key: "canvas/other-user/file/hash",
        },
      }),
      "canvas_source_stored_file_corrupt",
      0,
    ],
    [
      "stored byte-count mismatch",
      () => ({
        file: {
          ...makeReadyFile({ bytes: PNG_BYTES, contentType: "image/png" }),
          stored_byte_count: PNG_BYTES.byteLength + 1,
        },
        bytes: PNG_BYTES,
      }),
      "canvas_source_stored_file_corrupt",
      1,
    ],
    [
      "SHA-256 mismatch",
      () => {
        const declaredHash = "f".repeat(64);
        const file = makeReadyFile({ bytes: PNG_BYTES, contentType: "image/png" });
        return {
          bytes: PNG_BYTES,
          file: {
            ...file,
            current_sha256: declaredHash,
            storage_object_key: safeObjectKeyForCanvasFile({
              contentHash: declaredHash,
              fileId: file.id,
              userId: USER_ID,
            }),
          },
        };
      },
      "canvas_source_stored_file_corrupt",
      1,
    ],
    [
      "image signature mismatch",
      () => ({
        bytes: new Uint8Array([0x66, 0x69, 0x78]),
        file: makeReadyFile({
          bytes: new Uint8Array([0x66, 0x69, 0x78]),
          contentType: "image/png",
          displayName: "Fictional diagram.png",
          filename: "fictional-diagram.png",
        }),
      }),
      "canvas_source_stored_file_corrupt",
      1,
    ],
  ])("rejects %s before returning source text", async (_name, arrange, code, calls) => {
    const arranged = arrange();
    const arrangedBytes =
      "bytes" in arranged && arranged.bytes instanceof Uint8Array
        ? arranged.bytes
        : undefined;
    const storage = createStorageClient(
      arrangedBytes ? [[arranged.file.storage_object_key ?? "", arrangedBytes]] : [],
    );
    const provider = createFakeOcrProvider("Should not be used.");

    const result = await extract(arranged.file, storage.client, provider);

    expect(result).toMatchObject({ ok: false, code });
    expect(storage.calls).toHaveLength(calls);
    expect(provider.calls).toHaveLength(0);
    expect(JSON.stringify(result)).not.toContain("Should not be used");
  });

  it("rejects PDF signature mismatch as a corrupt stored file", async () => {
    const bytes = new TextEncoder().encode("not a pdf");
    const file = makeReadyFile({
      bytes,
      contentType: "application/pdf",
      displayName: "Fictional handout.pdf",
      filename: "fictional-handout.pdf",
    });
    const storage = createStorageClient([[file.storage_object_key ?? "", bytes]]);

    const result = await extract(file, storage.client, createFakeOcrProvider("unused"));

    expect(result).toMatchObject({
      ok: false,
      code: "canvas_source_stored_file_corrupt",
    });
  });

  it("rejects encrypted PDFs without invoking OCR", async () => {
    const bytes = new TextEncoder().encode("%PDF-1.7\n1 0 obj\n/Encrypt\nendobj");
    const file = makeReadyFile({
      bytes,
      contentType: "application/pdf",
      displayName: "Fictional locked.pdf",
      filename: "fictional-locked.pdf",
    });
    const storage = createStorageClient([[file.storage_object_key ?? "", bytes]]);
    const provider = createFakeOcrProvider("unused");

    const result = await extract(file, storage.client, provider);

    expect(result).toMatchObject({
      ok: false,
      code: "canvas_source_pdf_encrypted",
    });
    expect(provider.calls).toHaveLength(0);
  });

  it("rejects PDFs over the configured document page limit", async () => {
    const bytes = await makePdfBytes(DOCUMENT_MAX_PDF_PAGES + 1);
    const file = makeReadyFile({
      bytes,
      contentType: "application/pdf",
      displayName: "Fictional long packet.pdf",
      filename: "fictional-long-packet.pdf",
    });
    const storage = createStorageClient([[file.storage_object_key ?? "", bytes]]);

    const result = await extract(file, storage.client, createFakeOcrProvider("unused"));

    expect(result).toMatchObject({
      ok: false,
      code: "canvas_source_pdf_page_limit_exceeded",
    });
  });

  it.each([
    ["image", PNG_BYTES, "image/png", "canvas_source_image_ocr_empty"],
    [
      "PDF",
      null,
      "application/pdf",
      "canvas_source_pdf_ocr_empty",
    ],
  ])("rejects empty %s OCR output", async (_kind, inputBytes, contentType, code) => {
    const bytes = inputBytes ?? (await makePdfBytes(1));
    const file = makeReadyFile({
      bytes,
      contentType,
      displayName:
        contentType === "application/pdf" ? "Fictional handout.pdf" : "Fictional image.png",
      filename:
        contentType === "application/pdf" ? "fictional-handout.pdf" : "fictional-image.png",
    });
    const storage = createStorageClient([[file.storage_object_key ?? "", bytes]]);

    const result = await extract(file, storage.client, createFakeOcrProvider("   "));

    expect(result).toMatchObject({ ok: false, code });
  });

  it.each([
    [
      "not configured",
      new OcrProviderError({
        code: "ocr_not_configured",
        message: "private provider setup detail",
      }),
      "canvas_source_ocr_not_configured",
    ],
    [
      "provider failure",
      new OcrProviderError({
        code: "ocr_provider_failed",
        message: "private provider failure detail",
      }),
      "canvas_source_ocr_failed",
    ],
  ])("maps OCR provider %s safely", async (_name, error, code) => {
    const file = makeReadyFile({ bytes: PNG_BYTES, contentType: "image/png" });
    const storage = createStorageClient([[file.storage_object_key ?? "", PNG_BYTES]]);

    const result = await extract(file, storage.client, createThrowingOcrProvider(error));

    expect(result).toMatchObject({ ok: false, code });
    expect(JSON.stringify(result)).not.toContain("private provider");
  });
});

function extract(
  fileRow: CanvasFileRow,
  client: SupabaseClient<Database>,
  ocrProvider?: OcrProvider,
) {
  return extractPreparedCanvasFileText({
    client,
    connectionId: CONNECTION_ID,
    courseId: COURSE_ID,
    fileRow,
    ocrProvider,
    userId: USER_ID,
  });
}

function createStorageClient(
  entries: readonly (readonly [string, Uint8Array])[],
): {
  readonly calls: { readonly bucket: string; readonly key: string }[];
  readonly client: SupabaseClient<Database>;
} {
  const dataByKey = new Map(entries);
  const calls: { readonly bucket: string; readonly key: string }[] = [];

  return {
    calls,
    client: {
      storage: {
        from: (bucket: string) => ({
          download: async (key: string) => {
            calls.push({ bucket, key });
            const bytes = dataByKey.get(key);
            if (!bytes) {
              return {
                data: null,
                error: { message: "Object not found", name: "StorageApiError", status: 404 },
              };
            }
            return {
              data: new Blob([arrayBufferFromBytes(bytes)]),
              error: null,
            };
          },
        }),
      },
    } as unknown as SupabaseClient<Database>,
  };
}

function createFakeOcrProvider(
  textOrFactory: string | ((input: OcrInput) => string),
): OcrProvider & { readonly calls: OcrInput[] } {
  const calls: OcrInput[] = [];
  return {
    calls,
    id: "fake-ocr",
    async extract(input) {
      calls.push(input);
      const text =
        typeof textOrFactory === "function" ? textOrFactory(input) : textOrFactory;
      return ocrResult(input, text);
    },
  };
}

function createThrowingOcrProvider(error: Error): OcrProvider {
  return {
    id: "fake-ocr",
    async extract() {
      throw error;
    },
  };
}

function ocrResult(input: OcrInput, text: string): OcrResult {
  const normalizedText = text.trim() ? text : "";
  const pageTexts = normalizedText.split("\n\n");
  const pages =
    input.kind === "pdf"
      ? input.requestedPages.map((pageNumber, index) => ({
          blocks: [],
          method: (pageTexts[index] ? "ocr" : "blank") as "ocr" | "blank",
          pageNumber,
          status: (pageTexts[index] ? "text_extracted" : "blank") as
            | "text_extracted"
            | "blank",
          text: pageTexts[index] ?? "",
        }))
      : [{
          blocks: [],
          method: (normalizedText ? "ocr" : "blank") as "ocr" | "blank",
          pageNumber: 1,
          status: (normalizedText ? "text_extracted" : "blank") as
            | "text_extracted"
            | "blank",
          text: normalizedText,
        }];
  return {
    mimeType: input.mimeType,
    pages,
    provider: "fake-ocr",
    text: normalizedText,
    warnings: [],
  };
}

function makeReadyFile({
  bytes,
  contentType,
  displayName = contentType === "application/pdf"
    ? "Fictional handout.pdf"
    : "Fictional image.png",
  filename = contentType === "application/pdf"
    ? "fictional-handout.pdf"
    : "fictional-image.png",
}: {
  readonly bytes: Uint8Array;
  readonly contentType: string;
  readonly displayName?: string;
  readonly filename?: string;
}): CanvasFileRow {
  const hash = createHash("sha256").update(bytes).digest("hex");
  return {
    availability_status: "available",
    canvas_connection_id: CONNECTION_ID,
    canvas_course_id: "101",
    canvas_created_at: NOW,
    canvas_file_id: "file-1",
    canvas_modified_at: NOW,
    canvas_updated_at: NOW,
    content_type: contentType,
    content_version_fingerprint: "fictional-content-version",
    course_id: COURSE_ID,
    created_at: NOW,
    current_sha256: hash,
    display_name: displayName,
    filename,
    first_synced_at: NOW,
    folder_id: null,
    hidden: false,
    hidden_for_user: false,
    id: FILE_ID,
    ingestion_eligibility:
      contentType === "application/pdf" || contentType.startsWith("text/") || contentType===OFFICE_MIME.docx || contentType===OFFICE_MIME.pptx
        ? "eligible_document"
        : "eligible_image",
    ingestion_status: "stored",
    last_successful_ingestion_at: NOW,
    last_successful_inventory_at: NOW,
    last_synced_at: NOW,
    lock_at: null,
    locked: false,
    media_class: null,
    media_entry_id: null,
    metadata_fingerprint: "fictional-metadata",
    size_bytes: bytes.byteLength,
    storage_bucket: CANVAS_SOURCE_FILE_BUCKET,
    storage_object_key: safeObjectKeyForCanvasFile({
      contentHash: hash,
      fileId: FILE_ID,
      userId: USER_ID,
    }),
    stored_byte_count: bytes.byteLength,
    stored_content_type: contentType,
    unlock_at: null,
    updated_at: NOW,
    user_id: USER_ID,
    visibility_level: null,
  };
}

function arrayBufferFromBytes(bytes: Uint8Array): ArrayBuffer {
  const buffer = new ArrayBuffer(bytes.byteLength);
  new Uint8Array(buffer).set(bytes);
  return buffer;
}

async function makePdfBytes(pageCount: number): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  for (let index = 0; index < pageCount; index += 1) {
    pdf
      .addPage([200, 200])
      .drawRectangle({ x: 20, y: 20, width: 20, height: 20 });
  }
  return pdf.save({ updateFieldAppearances: false });
}
