import { EncryptedPDFError, PDFDocument } from "pdf-lib";

export type PdfValidationFailureCode = "invalid_pdf" | "pdf_encrypted";

export type PdfPageCountResult =
  | {
      readonly ok: true;
      readonly pageCount: number;
    }
  | {
      readonly ok: false;
      readonly code: PdfValidationFailureCode;
    };

export async function readPdfPageCount(
  bytes: Uint8Array,
): Promise<PdfPageCountResult> {
  if (hasPdfEncryptionMarker(bytes)) {
    return {
      ok: false,
      code: "pdf_encrypted",
    };
  }

  try {
    const document = await PDFDocument.load(bytes, {
      updateMetadata: false,
    });

    return {
      ok: true,
      pageCount: document.getPageCount(),
    };
  } catch (error) {
    if (error instanceof EncryptedPDFError) {
      return {
        ok: false,
        code: "pdf_encrypted",
      };
    }

    return {
      ok: false,
      code: "invalid_pdf",
    };
  }
}

export function hasPdfSignature(bytes: Uint8Array): boolean {
  return (
    bytes.length >= 5 &&
    bytes[0] === 0x25 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x44 &&
    bytes[3] === 0x46 &&
    bytes[4] === 0x2d
  );
}

export function createRequestedPdfPages(pageCount: number): readonly number[] {
  return Array.from({ length: pageCount }, (_, index) => index + 1);
}

function hasPdfEncryptionMarker(bytes: Uint8Array): boolean {
  const decoded = new TextDecoder("latin1", { fatal: false }).decode(bytes);
  return /\/Encrypt\b/.test(decoded);
}
