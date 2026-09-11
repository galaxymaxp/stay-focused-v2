import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

const migration = readFileSync(
  resolve(
    process.cwd(),
    "../../packages/db/migrations/20260911125600_allow_canvas_snapshot_document_page_limit.sql",
  ),
  "utf8",
)
  .replace(/\r\n?/g, "\n")
  .toLowerCase();

describe("Canvas reviewer source snapshot database contract", () => {
  it("accepts the synchronous Canvas PDF page limit", () => {
    expect(migration).toContain(
      "drop constraint if exists reviewer_source_snapshot_items_page_count_limit",
    );
    expect(migration).toContain("page_count between 1 and 40");
    expect(migration).toContain(
      "validate constraint reviewer_source_snapshot_items_page_count_limit",
    );
  });
});
