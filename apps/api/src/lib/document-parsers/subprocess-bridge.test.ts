import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import {
  createSubprocessParserBridge,
} from "./subprocess-bridge";

const directories: string[] = [];
const input = {
  bytes: new Uint8Array([37, 80, 68, 70]),
  mimeType: "application/pdf",
  pageCount: 1,
  signals: {
    pageCount: 1,
    nativeTextPageCount: 1,
    ocrRequiredPageCount: 0,
    nativeTextCharacterCount: 4,
  },
};

afterEach(async () => {
  await Promise.all(directories.splice(0).map((directory) =>
    rm(directory, { recursive: true, force: true })
  ));
});

describe("external parser subprocess bridge", () => {
  it("reads a fake parser JSON envelope without parser packages", async () => {
    const bridgePath = await createFakeBridge(`
      import { writeFile } from "node:fs/promises";
      const outputIndex = process.argv.indexOf("--output");
      await writeFile(process.argv[outputIndex + 1], JSON.stringify({ native: { ok: true } }));
    `);
    const bridge = createSubprocessParserBridge({
      parser: "docling",
      pythonPath: process.execPath,
      bridgePath,
      timeoutMs: 5_000,
    });
    await expect(bridge.isAvailable()).resolves.toBe(true);
    await expect(bridge.parse(input)).resolves.toEqual({ native: { ok: true } });
  });

  it("returns a typed error without exposing invalid parser output", async () => {
    const bridgePath = await createFakeBridge(`
      import { writeFile } from "node:fs/promises";
      const outputIndex = process.argv.indexOf("--output");
      await writeFile(process.argv[outputIndex + 1], "not-json");
    `);
    const bridge = createSubprocessParserBridge({
      parser: "mineru",
      pythonPath: process.execPath,
      bridgePath,
      timeoutMs: 5_000,
    });
    await expect(bridge.parse(input)).rejects.toMatchObject({
      code: "invalid_output",
      message: "External document parser invalid output.",
    });
  });
});

async function createFakeBridge(source: string): Promise<string> {
  const directory = await mkdtemp(join(tmpdir(), "stay-focused-parser-test-"));
  directories.push(directory);
  const path = join(directory, "bridge.mjs");
  await writeFile(path, source, "utf8");
  return path;
}
