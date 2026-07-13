import { describe, expect, it, vi } from "vitest";

import {
  isMeaningfulCanvasContent,
  normalizeCanvasHtmlToText,
} from "./canvas-content-normalization";
import {
  resolveCanvasUsableContent,
  type CanvasUsableContentCandidate,
} from "./canvas-usable-content";

const USER_ID = "00000000-0000-4000-8000-000000000001";
const CONNECTION_ID = "00000000-0000-4000-8000-000000000002";
const COURSE_ID = "00000000-0000-4000-8000-000000000003";

function candidate(
  overrides: Partial<CanvasUsableContentCandidate> = {},
): CanvasUsableContentCandidate {
  return {
    sourceId: "page:00000000-0000-4000-8000-000000000004",
    sourceKind: "page",
    method: "synchronized_page_html",
    userId: USER_ID,
    connectionId: CONNECTION_ID,
    courseId: COURSE_ID,
    expectedUserId: USER_ID,
    expectedConnectionId: CONNECTION_ID,
    expectedCourseId: COURSE_ID,
    accessible: true,
    html: "<h2>Photosynthesis</h2><p>Plants convert light into chemical energy.</p>",
    provenance: { resourceId: "00000000-0000-4000-8000-000000000004" },
    ...overrides,
  };
}

describe("Canvas content normalization", () => {
  it("keeps instructional structure while removing hidden Canvas chrome", () => {
    const text = normalizeCanvasHtmlToText(`
      <nav>Modules Grades Calendar</nav>
      <h2>Transport layer</h2>
      <p>TCP provides reliable delivery.</p>
      <ul><li>Sequencing</li><li>Retransmission</li></ul>
      <table><tr><th>Protocol</th><th>Port</th></tr><tr><td>HTTPS</td><td>443</td></tr></table>
      <div aria-hidden="true">Edit Delete Publish</div>
      <script>steal()</script>
    `);

    expect(text).toContain("Transport layer");
    expect(text).toContain("TCP provides reliable delivery.");
    expect(text).toContain("- Sequencing");
    expect(text).toContain("Protocol | Port");
    expect(text).not.toContain("Modules Grades Calendar");
    expect(text).not.toContain("Edit Delete Publish");
    expect(text).not.toContain("steal");
  });

  it.each([
    ["<h2>TCP/IP</h2><p>Port 443</p>", true],
    ["<ul><li>Mitosis</li><li>Meiosis</li></ul>", true],
    ["<p>x = y + 2</p>", true],
    ["<h2>Overview</h2>", false],
    ["<nav>Home Modules Grades Calendar</nav>", false],
    ["<p>Edit Delete Publish Previous Next</p>", false],
    ["<p>&nbsp;\u200b\u200d</p>", false],
  ])("classifies meaningful evidence without a sentence or length proxy", (html, expected) => {
    expect(isMeaningfulCanvasContent(normalizeCanvasHtmlToText(html))).toBe(expected);
  });
});

describe("resolveCanvasUsableContent", () => {
  it("returns normalized synchronized content and content-only source text", async () => {
    const result = await resolveCanvasUsableContent(candidate());

    expect(result.status).toBe("usable");
    expect(result.sourceText).toBe(
      "Photosynthesis\n\nPlants convert light into chemical energy.",
    );
    expect(result.sourceText).not.toContain("SOURCE");
    expect(result.sourceText).not.toContain("page:");
    expect(result.provenance).toMatchObject({
      method: "synchronized_page_html",
      resourceId: "00000000-0000-4000-8000-000000000004",
    });
  });

  it("does not turn a title, type label, or filename into source", async () => {
    const result = await resolveCanvasUsableContent(
      candidate({ html: "<h1>Overview</h1>", title: "Unit 4 study guide" }),
    );

    expect(result).toMatchObject({ status: "empty" });
    expect(result).not.toHaveProperty("sourceText");
    expect(JSON.stringify(result)).not.toContain("Unit 4 study guide");
  });

  it("rejects ownership-boundary mismatches before reading content", async () => {
    const extractFile = vi.fn();
    const result = await resolveCanvasUsableContent(
      candidate({
        sourceKind: "file",
        method: "stored_pdf_ocr",
        html: undefined,
        expectedCourseId: "00000000-0000-4000-8000-000000000099",
        extractFile,
      }),
    );

    expect(result).toMatchObject({ status: "inaccessible" });
    expect(result).not.toHaveProperty("sourceText");
    expect(extractFile).not.toHaveBeenCalled();
  });

  it.each(["SubHeader", "ExternalUrl", "ExternalTool", "Quiz", "Discussion"])(
    "classifies unsupported module item %s without following it",
    async (moduleItemType) => {
      const resolveLinkedItem = vi.fn();
      const result = await resolveCanvasUsableContent(
        candidate({
          sourceKind: "module_item",
          method: "module_reference",
          html: undefined,
          moduleItemType,
          resolveLinkedItem,
        }),
      );

      expect(result).toMatchObject({ status: "unsupported" });
      expect(result).not.toHaveProperty("sourceText");
      expect(resolveLinkedItem).not.toHaveBeenCalled();
    },
  );

  it("resolves supported module references once and preserves structured provenance", async () => {
    const resolveLinkedItem = vi.fn(async () => candidate());
    const result = await resolveCanvasUsableContent(
      candidate({
        sourceKind: "module_item",
        method: "module_reference",
        html: undefined,
        moduleItemType: "Page",
        provenance: { moduleItemId: "00000000-0000-4000-8000-000000000005" },
        resolveLinkedItem,
      }),
    );

    expect(result.status).toBe("usable");
    expect(resolveLinkedItem).toHaveBeenCalledTimes(1);
    expect(result.provenance).toMatchObject({
      moduleItemId: "00000000-0000-4000-8000-000000000005",
      resourceId: "00000000-0000-4000-8000-000000000004",
    });
  });

  it.each([
    ["empty", "empty"],
    ["unsupported", "unsupported"],
    ["inaccessible", "inaccessible"],
    ["failed", "failed"],
  ] as const)("maps protected file extraction %s without leaking source", async (fileStatus, status) => {
    const result = await resolveCanvasUsableContent(
      candidate({
        sourceKind: "file",
        method: "stored_pdf_ocr",
        html: undefined,
        extractFile: async () => ({ status: fileStatus }),
      }),
    );

    expect(result).toMatchObject({ status });
    expect(result).not.toHaveProperty("sourceText");
  });

  it("accepts complete readable protected extraction without a second call", async () => {
    const extractFile = vi.fn(async () => ({
      status: "usable" as const,
      text: "Page one facts.\n\nPage two facts.",
      evidence: { pageCount: 2 },
    }));
    const result = await resolveCanvasUsableContent(
      candidate({
        sourceKind: "file",
        method: "stored_pdf_ocr",
        html: undefined,
        extractFile,
      }),
    );

    expect(result).toMatchObject({
      status: "usable",
      sourceText: "Page one facts.\n\nPage two facts.",
      evidence: { pageCount: 2 },
    });
    expect(extractFile).toHaveBeenCalledTimes(1);
  });
});
