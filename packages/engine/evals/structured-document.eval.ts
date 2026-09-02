import fixtures from "./fixtures/structured-documents.json" with { type: "json" };

import {
  classifyDocument,
  evaluateParserQuality,
  routeDocument,
  type DocumentInput,
  type DocumentParser,
} from "../src/document-parser.js";
import { normalizeSource } from "../src/stage0-normalize.js";
import { detectOutline } from "../src/stage1-outline.js";
import type { StructuredDocument } from "../src/structured-document.js";
import {
  mapDoclingDocument,
  mapMinerUDocument,
} from "../src/structured-parser-adapters.js";
import {
  assertDeepEqual,
  assertEqual,
  assertIncludes,
} from "./assert.js";
import type { EvalCase, EvalIssue, EvalSuite } from "./types.js";

const codeHeavy = fixtures.codeHeavy as unknown as StructuredDocument;
const centralTendency = fixtures.centralTendency as unknown as StructuredDocument;
const accounting = fixtures.accounting as unknown as StructuredDocument;

export const structuredDocumentSuite: EvalSuite = {
  name: "Structured document parsing",
  cases: [
    structureCase(),
    statisticsCase(),
    accountingCase(),
    doclingAdapterCase(),
    mineruAdapterCase(),
    doclingSuccessCase(),
    doclingQualityFallbackCase(),
    scannedDirectMinerUCase(),
    minerUUnavailableCase(),
    legacyOnlyCase(),
    safeFailureDiagnosticCase(),
    classifierCase(),
    ocrQualityCase(),
  ],
};

function structureCase(): EvalCase {
  return {
    name: "typed code, list, repeated heading, and reading order survive Stage 0",
    run: async () => {
      const source = await normalizeSource({ structuredDocument: codeHeavy });
      const outline = await detectOutline(source);
      const code = source.blocks.find((block) => block.id === "c-code");
      const generatorSections = outline.sections.filter(
        (section) => section.title === "Generator Expressions",
      );
      return [
        ...assertDeepEqual(source.blocks.map((block) => block.kind), ["heading", "paragraph", "code", "list", "heading", "paragraph"], "Typed block order changed."),
        ...assertEqual(code?.text, "items = [\"REVIEW\", \"ACTIVITY\"]\nresult = (item for item in items)", "Code source text changed."),
        ...assertEqual(code?.structuredBlock?.type, "code", "Code provenance was flattened."),
        ...assertEqual(outline.sections.some((section) => section.title.includes("items =")), false, "Code became a heading candidate."),
        ...assertEqual(outline.sections.some((section) => section.title === "REVIEW" || section.title === "ACTIVITY"), false, "List literals became headings."),
        ...assertEqual(generatorSections.length, 1, "Repeated typed headings were not consolidated."),
        ...assertEqual(generatorSections[0]?.sourceBlockIds.includes("c-p2"), true, "Repeated concept body was lost."),
      ];
    },
  };
}

function statisticsCase(): EvalCase {
  return {
    name: "formula and table relationships retain numeric provenance",
    run: async () => {
      const source = await normalizeSource({ structuredDocument: centralTendency });
      const outline = await detectOutline(source);
      const meanTable = source.blocks.find((block) => block.id === "s-t-mean");
      const table = meanTable?.structuredBlock?.type === "table"
        ? meanTable.structuredBlock
        : undefined;
      const numericCell = table?.rows[0]?.cells[1];
      return [
        ...assertDeepEqual(source.blocks.filter((block) => block.kind === "formula").map((block) => block.id), ["s-f-mean", "s-f-median"], "Formula typing was lost."),
        ...assertEqual(table?.rows.length, 1, "Table rows were flattened."),
        ...assertEqual(numericCell?.text, "67", "Numeric cell changed."),
        ...assertDeepEqual(numericCell?.provenance.tableCell, { tableBlockId: "s-t-mean", rowIndex: 0, columnIndex: 1 }, "Cell provenance was lost."),
        ...assertEqual(outline.sections.find((section) => section.title === "Mean")?.sourceBlockIds.includes("s-t-mean"), true, "Mean table was detached from its heading."),
        ...assertEqual(outline.sections.some((section) => section.title === "Course handout footer"), false, "Metadata became a section."),
      ];
    },
  };
}

function accountingCase(): EvalCase {
  return {
    name: "OCR ledger preserves only supplied cells and their provenance",
    run: async () => {
      const source = await normalizeSource({ structuredDocument: accounting });
      const ledger = source.blocks.find((block) => block.id === "a-table")?.structuredBlock;
      const cells = ledger?.type === "table" ? ledger.rows.flatMap((row) => row.cells) : [];
      return [
        ...assertEqual(source.blocks[0]?.metadata?.textOrigin, "ocr", "OCR origin was lost."),
        ...assertEqual(cells.length, 4, "Missing ledger cells were synthesized or supplied cells were lost."),
        ...assertEqual(cells.find((cell) => cell.text === "12,500")?.provenance.tableCell?.columnIndex, 1, "Ledger numeric provenance was lost."),
      ];
    },
  };
}

function doclingAdapterCase(): EvalCase {
  return {
    name: "Docling native tree maps to the provider-independent contract",
    run: async () => {
      const document = mapDoclingDocument({
        name: "Fixture",
        pages: { "1": { page_no: 1, size: { width: 100, height: 200 } } },
        body: { children: [{ $ref: "#/texts/0" }, { $ref: "#/tables/0" }] },
        texts: [{ self_ref: "#/texts/0", label: "code", text: "yield 1", prov: [{ page_no: 1, bbox: { l: 1, t: 2, r: 3, b: 4 } }] }],
        tables: [{ self_ref: "#/tables/0", label: "table", prov: [{ page_no: 1 }], data: { table_cells: [{ start_row_offset_idx: 0, start_col_offset_idx: 0, row_span: 1, col_span: 1, text: "10" }] } }],
        pictures: [],
        groups: [],
      }, { sourceId: "docling-native" });
      const table = document.pages[0]?.blocks[1];
      return [
        ...assertDeepEqual(document.pages[0]?.blocks.map((block) => block.type), ["code", "table"], "Docling block typing failed."),
        ...assertEqual(table?.type === "table" ? table.rows[0]?.cells[0]?.text : undefined, "10", "Docling table cell mapping failed."),
        ...assertEqual(document.pages[0]?.blocks[0]?.provenance.boundingBox?.left, 1, "Docling coordinates were lost."),
      ];
    },
  };
}

function mineruAdapterCase(): EvalCase {
  return {
    name: "MinerU content list maps formulas and HTML table cells",
    run: async () => {
      const document = mapMinerUDocument([
        { type: "equation", page_idx: 0, text: "$$x=1$$", bbox: [1, 2, 3, 4] },
        { type: "table", page_idx: 0, table_body: "<table><tr><th rowspan=\"2\">A</th><td>67</td></tr><tr><td>68</td></tr></table>" },
      ], { sourceId: "mineru-native" });
      const table = document.pages[0]?.blocks[1];
      return [
        ...assertDeepEqual(document.pages[0]?.blocks.map((block) => block.type), ["formula", "table"], "MinerU block typing failed."),
        ...assertEqual(document.pages[0]?.blocks[0]?.type === "formula" ? document.pages[0].blocks[0].latex : undefined, "x=1", "MinerU LaTeX mapping failed."),
        ...assertEqual(table?.type === "table" ? table.rows[0]?.cells[1]?.text : undefined, "67", "MinerU table cell mapping failed."),
        ...assertEqual(table?.type === "table" ? table.rows[0]?.cells[0]?.rowSpan : undefined, 2, "MinerU table row span was lost."),
        ...assertEqual(table?.type === "table" ? table.rows[1]?.cells[0]?.columnIndex : undefined, 1, "MinerU spanned-cell column index shifted."),
      ];
    },
  };
}

function doclingSuccessCase(): EvalCase {
  return routingCase("Docling success does not invoke fallbacks", "hybrid", bornDigitalInput(), {
    expected: ["docling"],
    docling: codeHeavy,
    selected: "docling",
  });
}

function doclingQualityFallbackCase(): EvalCase {
  return routingCase("Docling quality rejection invokes MinerU", "hybrid", bornDigitalInput(), {
    expected: ["docling", "mineru"],
    docling: emptyDocument("docling"),
    mineru: centralTendency,
    selected: "mineru",
  });
}

function scannedDirectMinerUCase(): EvalCase {
  return routingCase("scanned source selects MinerU directly", "hybrid", scannedInput(), {
    expected: ["mineru"],
    mineru: accounting,
    selected: "mineru",
  });
}

function minerUUnavailableCase(): EvalCase {
  return routingCase("unavailable MinerU falls back to legacy", "hybrid", scannedInput(), {
    expected: ["mineru", "legacy"],
    legacy: accounting,
    mineruAvailable: false,
    selected: "legacy",
  });
}

function legacyOnlyCase(): EvalCase {
  return routingCase("legacy mode leaves external parsers disabled", "legacy", bornDigitalInput(), {
    expected: ["legacy"],
    legacy: codeHeavy,
    selected: "legacy",
  });
}

function safeFailureDiagnosticCase(): EvalCase {
  return {
    name: "external failures become safe typed diagnostics",
    run: async () => {
      const calls: string[] = [];
      const result = await routeDocument({
        input: bornDigitalInput(),
        mode: "hybrid",
        parsers: {
          docling: fakeParser("docling", calls, codeHeavy, true, new Error("C:\\private\\model.py stack trace")),
          mineru: fakeParser("mineru", calls, centralTendency),
          legacy: fakeParser("legacy", calls, codeHeavy),
        },
      });
      const diagnostic = result.attempts[0]?.diagnostics[0];
      return [
        ...assertEqual(diagnostic?.code, "parser_failed", "Failure diagnostic code was not typed."),
        ...assertEqual(diagnostic?.message, "Parser execution failed.", "Internal failure details leaked."),
        ...assertEqual(diagnostic?.message.includes("private"), false, "Filesystem path leaked."),
      ];
    },
  };
}

function classifierCase(): EvalCase {
  return {
    name: "classification uses observable structural signals",
    run: async () => [
      ...assertEqual(classifyDocument(bornDigitalInput().signals), "born-digital", "Born-digital signals misclassified."),
      ...assertEqual(classifyDocument(scannedInput().signals), "scanned-ocr-heavy", "Scanned signals misclassified."),
      ...assertEqual(classifyDocument({ ...bornDigitalInput().signals, codeRegionCount: 4 }), "code-heavy", "Code signals misclassified."),
      ...assertEqual(classifyDocument({ ...bornDigitalInput().signals, tableRegionCount: 3 }), "formula-table-heavy", "Table signals misclassified."),
      ...assertEqual(classifyDocument({ ...bornDigitalInput().signals, pageCount: 4, blankPageCount: 2 }), "born-digital", "Explicit blank pages were treated as OCR-heavy."),
    ],
  };
}

function ocrQualityCase(): EvalCase {
  return {
    name: "quality gate uses OCR confidence when supplied",
    run: async () => {
      const firstPage = accounting.pages[0];
      const firstBlock = firstPage?.blocks[0];
      if (!firstPage || !firstBlock) return [{ message: "Accounting fixture is incomplete." }];
      const document: StructuredDocument = {
        ...accounting,
        pages: [{
          ...firstPage,
          blocks: [{ ...firstBlock, confidence: 0.2 }, ...firstPage.blocks.slice(1)],
        }],
      };
      const quality = evaluateParserQuality(document);
      return [
        ...assertEqual(quality.accepted, false, "Low-confidence OCR was accepted."),
        ...assertEqual(quality.lowOcrConfidenceBlockCount, 1, "Low OCR confidence was not counted."),
        ...assertIncludes(quality.diagnostics.map((diagnostic) => diagnostic.code).join(","), "ocr_confidence_low", "OCR confidence diagnostic was missing."),
      ];
    },
  };
}

function routingCase(
  name: string,
  mode: "legacy" | "docling" | "hybrid",
  input: DocumentInput,
  options: {
    readonly expected: readonly string[];
    readonly selected: string;
    readonly docling?: StructuredDocument;
    readonly mineru?: StructuredDocument;
    readonly legacy?: StructuredDocument;
    readonly mineruAvailable?: boolean;
  },
): EvalCase {
  return {
    name,
    run: async () => {
      const calls: string[] = [];
      const result = await routeDocument({
        input,
        mode,
        parsers: {
          docling: fakeParser("docling", calls, options.docling ?? codeHeavy),
          mineru: fakeParser("mineru", calls, options.mineru ?? accounting, options.mineruAvailable ?? true),
          legacy: fakeParser("legacy", calls, options.legacy ?? codeHeavy),
        },
      });
      return [
        ...assertDeepEqual(calls, options.expected, "Unexpected parser invocation order."),
        ...assertEqual(result.selectedParser, options.selected, "Unexpected selected parser."),
      ];
    },
  };
}

function fakeParser(
  name: "legacy" | "docling" | "mineru",
  calls: string[],
  document: StructuredDocument,
  available = true,
  failure?: Error,
): DocumentParser {
  return {
    name,
    canParse: async () => {
      calls.push(name);
      return { available, confidence: available ? 1 : 0 };
    },
    parse: async () => {
      if (failure) throw failure;
      return document;
    },
  };
}

function bornDigitalInput(): DocumentInput {
  return {
    bytes: new Uint8Array([1]),
    mimeType: "application/pdf",
    pageCount: 2,
    signals: {
      pageCount: 2,
      nativeTextPageCount: 2,
      ocrRequiredPageCount: 0,
      nativeTextCharacterCount: 20,
    },
  };
}

function scannedInput(): DocumentInput {
  return {
    bytes: new Uint8Array([1]),
    mimeType: "application/pdf",
    pageCount: 1,
    signals: {
      pageCount: 1,
      nativeTextPageCount: 0,
      ocrRequiredPageCount: 1,
      nativeTextCharacterCount: 0,
      imageDominantPageCount: 1,
    },
  };
}

function emptyDocument(parser: "docling" | "mineru"): StructuredDocument {
  return {
    schemaVersion: "structured-document-v1",
    pageCount: 2,
    pages: [{ pageNumber: 1, blocks: [] }, { pageNumber: 2, blocks: [] }],
    parser: { name: parser },
    diagnostics: [],
  };
}
