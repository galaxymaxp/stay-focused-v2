import { describe, expect, it } from "vitest";

import type { OcrClientError } from "../../services/ocrApi";
import type { SelectedGalleryImage } from "./galleryImage";
import type { SelectedPdfDocument } from "./pdfDocument";
import {
  canExtractPdfText,
  getCurrentSourceText,
  initialReviewerSourceState,
  reviewerSourceReducer,
} from "./reviewerSourceFlow";

describe("reviewer source flow", () => {
  it("keeps manual paste available by default", () => {
    const state = reviewerSourceReducer(initialReviewerSourceState, {
      type: "edit_source_text",
      value: "Manual notes",
    });

    expect(state.mode).toBe("paste");
    expect(getCurrentSourceText(state)).toBe("Manual notes");
  });

  it("switches to image mode", () => {
    const state = reviewerSourceReducer(initialReviewerSourceState, {
      type: "switch_mode",
      mode: "image",
    });

    expect(state.mode).toBe("image");
    expect(getCurrentSourceText(state)).toBe("");
  });

  it("switches to PDF mode", () => {
    const state = reviewerSourceReducer(initialReviewerSourceState, {
      type: "switch_mode",
      mode: "pdf",
    });

    expect(state.mode).toBe("pdf");
    expect(getCurrentSourceText(state)).toBe("");
  });

  it("ignores cancelled picker selections without showing an error", () => {
    const state = reviewerSourceReducer(initialReviewerSourceState, {
      type: "image_selection_cancelled",
    });

    expect(state.ocrError).toBeNull();
    expect(state.selectedImage).toBeNull();
  });

  it("shows permission denied safely", () => {
    const state = reviewerSourceReducer(initialReviewerSourceState, {
      type: "image_selection_failed",
      error: {
        code: "permission_denied",
        message: "native permission detail",
      },
    });

    expect(state.mode).toBe("image");
    expect(state.ocrError).toMatchObject({
      code: "permission_denied",
      title: "Photo access needed",
    });
    expect(JSON.stringify(state)).not.toContain("native permission detail");
  });

  it("shows camera permission denied safely", () => {
    const state = reviewerSourceReducer(initialReviewerSourceState, {
      type: "image_selection_failed",
      error: {
        code: "camera_permission_denied",
        message: "native camera permission detail",
      },
    });

    expect(state.mode).toBe("image");
    expect(state.ocrError).toMatchObject({
      code: "camera_permission_denied",
      title: "Camera access needed",
    });
    expect(JSON.stringify(state)).not.toContain("native camera permission detail");
  });

  it("stores a selected image and shows it as ready to extract", () => {
    const state = reviewerSourceReducer(initialReviewerSourceState, {
      type: "image_selected",
      image: image(),
    });

    expect(state.mode).toBe("image");
    expect(state.selectedImage?.fileName).toBe("notes.png");
    expect(state.ocrStatus).toBe("selected");
  });

  it("stores a selected PDF and shows metadata as ready to extract", () => {
    const state = reviewerSourceReducer(initialReviewerSourceState, {
      type: "pdf_selected",
      pdf: pdf(),
    });

    expect(state.mode).toBe("pdf");
    expect(state.selectedPdf?.fileName).toBe("notes.pdf");
    expect(state.ocrStatus).toBe("selected");
    expect(canExtractPdfText(state)).toBe(true);
  });

  it("ignores cancelled PDF selections without showing an error", () => {
    const state = reviewerSourceReducer(initialReviewerSourceState, {
      type: "pdf_selection_cancelled",
    });

    expect(state.ocrError).toBeNull();
    expect(state.selectedPdf).toBeNull();
  });

  it("shows wrong PDF file type safely", () => {
    const state = reviewerSourceReducer(initialReviewerSourceState, {
      type: "pdf_selection_failed",
      error: {
        code: "unsupported_file_type",
        message: "native picker detail",
      },
    });

    expect(state.mode).toBe("pdf");
    expect(state.ocrError).toMatchObject({
      code: "unsupported_file_type",
      title: "Use PDF",
    });
    expect(JSON.stringify(state)).not.toContain("native picker detail");
  });

  it("marks OCR loading state", () => {
    const selected = reviewerSourceReducer(initialReviewerSourceState, {
      type: "image_selected",
      image: image(),
    });

    const state = reviewerSourceReducer(selected, { type: "ocr_started" });

    expect(state.ocrStatus).toBe("uploading");
    expect(state.ocrError).toBeNull();
  });

  it("populates editable OCR text after success", () => {
    const selected = reviewerSourceReducer(initialReviewerSourceState, {
      type: "image_selected",
      image: image(),
    });

    const state = reviewerSourceReducer(selected, {
      type: "ocr_succeeded",
      text: "STUDY HABITS\nSet one clear goal.",
    });

    expect(state.ocrStatus).toBe("ready");
    expect(getCurrentSourceText(state)).toBe("STUDY HABITS\nSet one clear goal.");
  });

  it("populates editable PDF OCR text and page count after success", () => {
    const selected = reviewerSourceReducer(initialReviewerSourceState, {
      type: "pdf_selected",
      pdf: pdf(),
    });

    const state = reviewerSourceReducer(selected, {
      type: "ocr_succeeded",
      text: "STUDY HABITS\n\nREVIEW METHODS",
      pageCount: 2,
    });

    expect(state.mode).toBe("pdf");
    expect(state.ocrStatus).toBe("ready");
    expect(state.pdfPageCount).toBe(2);
    expect(getCurrentSourceText(state)).toBe("STUDY HABITS\n\nREVIEW METHODS");
  });

  it("preserves OCR line breaks", () => {
    const selected = reviewerSourceReducer(initialReviewerSourceState, {
      type: "image_selected",
      image: image(),
    });

    const state = reviewerSourceReducer(selected, {
      type: "ocr_succeeded",
      text: "Title\r\n\r\n- First\r\n- Second",
    });

    expect(getCurrentSourceText(state)).toBe("Title\n\n- First\n- Second");
  });

  it("shows OCR failures safely", () => {
    const state = reviewerSourceReducer(initialReviewerSourceState, {
      type: "ocr_failed",
      error: ocrError("ocr_provider_failed", "raw Google stack"),
    });

    expect(state.ocrStatus).toBe("failed");
    expect(state.ocrError).toMatchObject({
      code: "ocr_provider_failed",
      title: "OCR failed",
    });
    expect(JSON.stringify(state)).not.toContain("raw Google stack");
  });

  it("allows retry to succeed after failure", () => {
    const selected = reviewerSourceReducer(initialReviewerSourceState, {
      type: "image_selected",
      image: image(),
    });
    const failed = reviewerSourceReducer(selected, {
      type: "ocr_failed",
      error: ocrError("network_error", "offline"),
    });
    const retrying = reviewerSourceReducer(failed, { type: "ocr_started" });
    const ready = reviewerSourceReducer(retrying, {
      type: "ocr_succeeded",
      text: "Recovered text",
    });

    expect(ready.ocrStatus).toBe("ready");
    expect(ready.ocrError).toBeNull();
    expect(getCurrentSourceText(ready)).toBe("Recovered text");
  });

  it("allows PDF retry to succeed after failure", () => {
    const selected = reviewerSourceReducer(initialReviewerSourceState, {
      type: "pdf_selected",
      pdf: pdf(),
    });
    const failed = reviewerSourceReducer(selected, {
      type: "ocr_failed",
      error: ocrError("network_error", "offline"),
    });
    const retrying = reviewerSourceReducer(failed, { type: "ocr_started" });
    const ready = reviewerSourceReducer(retrying, {
      type: "ocr_succeeded",
      text: "Recovered PDF text",
      pageCount: 1,
    });

    expect(ready.ocrStatus).toBe("ready");
    expect(ready.ocrError).toBeNull();
    expect(getCurrentSourceText(ready)).toBe("Recovered PDF text");
  });

  it("clears imported image and OCR text", () => {
    const ready = reviewerSourceReducer(
      reviewerSourceReducer(initialReviewerSourceState, {
        type: "image_selected",
        image: image(),
      }),
      { type: "ocr_succeeded", text: "OCR text" },
    );

    const state = reviewerSourceReducer(ready, { type: "clear_image" });

    expect(state.selectedImage).toBeNull();
    expect(state.ocrText).toBe("");
    expect(state.ocrStatus).toBe("idle");
  });

  it("clears imported PDF and OCR text", () => {
    const ready = reviewerSourceReducer(
      reviewerSourceReducer(initialReviewerSourceState, {
        type: "pdf_selected",
        pdf: pdf(),
      }),
      { type: "ocr_succeeded", text: "PDF OCR text", pageCount: 1 },
    );

    const state = reviewerSourceReducer(ready, { type: "clear_pdf" });

    expect(state.selectedPdf).toBeNull();
    expect(state.pdfPageCount).toBeNull();
    expect(state.ocrText).toBe("");
    expect(state.ocrStatus).toBe("idle");
  });

  it("switches back to paste without losing manual text", () => {
    const pasted = reviewerSourceReducer(initialReviewerSourceState, {
      type: "edit_source_text",
      value: "Manual source",
    });
    const imageMode = reviewerSourceReducer(pasted, {
      type: "image_selected",
      image: image(),
    });
    const withOcr = reviewerSourceReducer(imageMode, {
      type: "ocr_succeeded",
      text: "OCR source",
    });
    const backToPaste = reviewerSourceReducer(withOcr, {
      type: "switch_mode",
      mode: "paste",
    });

    expect(getCurrentSourceText(backToPaste)).toBe("Manual source");
  });

  it("switches source modes without carrying stale PDF errors", () => {
    const failedPdf = reviewerSourceReducer(
      reviewerSourceReducer(initialReviewerSourceState, {
        type: "pdf_selected",
        pdf: pdf(),
      }),
      {
        type: "ocr_failed",
        error: ocrError("pdf_page_limit_exceeded", "too many pages"),
      },
    );

    const imageMode = reviewerSourceReducer(failedPdf, {
      type: "switch_mode",
      mode: "image",
    });

    expect(imageMode.mode).toBe("image");
    expect(imageMode.ocrError).toBeNull();
  });

  it("shows PDF page-limit errors safely", () => {
    const state = reviewerSourceReducer(initialReviewerSourceState, {
      type: "ocr_failed",
      error: ocrError("pdf_page_limit_exceeded", "raw detail"),
    });

    expect(state.ocrError).toMatchObject({
      code: "pdf_page_limit_exceeded",
      title: "PDF has too many pages",
    });
    expect(JSON.stringify(state)).not.toContain("raw detail");
  });

  it("shows password-protected PDF errors safely", () => {
    const state = reviewerSourceReducer(initialReviewerSourceState, {
      type: "ocr_failed",
      error: ocrError("pdf_encrypted", "raw detail"),
    });

    expect(state.ocrError).toMatchObject({
      code: "pdf_encrypted",
      title: "PDF is password-protected",
    });
    expect(JSON.stringify(state)).not.toContain("raw detail");
  });

  it("uses edited OCR text for reviewer generation", () => {
    const ready = reviewerSourceReducer(
      reviewerSourceReducer(initialReviewerSourceState, {
        type: "image_selected",
        image: image(),
      }),
      { type: "ocr_succeeded", text: "OCR line" },
    );

    const edited = reviewerSourceReducer(ready, {
      type: "edit_source_text",
      value: "OCR line corrected",
    });

    expect(getCurrentSourceText(edited)).toBe("OCR line corrected");
  });

  it("uses edited PDF OCR text for reviewer generation", () => {
    const ready = reviewerSourceReducer(
      reviewerSourceReducer(initialReviewerSourceState, {
        type: "pdf_selected",
        pdf: pdf(),
      }),
      { type: "ocr_succeeded", text: "PDF OCR line", pageCount: 1 },
    );

    const edited = reviewerSourceReducer(ready, {
      type: "edit_source_text",
      value: "PDF OCR line corrected",
    });

    expect(getCurrentSourceText(edited)).toBe("PDF OCR line corrected");
  });
});

function image(): SelectedGalleryImage {
  return {
    uri: "file:///notes.png",
    mimeType: "image/png",
    fileName: "notes.png",
    fileSize: 120,
    width: 100,
    height: 80,
  };
}

function pdf(): SelectedPdfDocument {
  return {
    uri: "file:///notes.pdf",
    mimeType: "application/pdf",
    fileName: "notes.pdf",
    fileSize: 240,
  };
}

function ocrError(
  code: OcrClientError["code"],
  message: string,
): OcrClientError {
  return { code, message };
}
