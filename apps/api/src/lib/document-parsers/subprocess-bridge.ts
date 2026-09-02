import { spawn } from "node:child_process";
import { access, mkdtemp, readFile, rm, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import type { DocumentInput, NativeParserBridge } from "@stay-focused/engine";

const MAX_NATIVE_OUTPUT_BYTES = 32 * 1024 * 1024;

export class ExternalParserBridgeError extends Error {
  public readonly code: "execution_failed" | "invalid_output" | "output_too_large" | "timeout";

  public constructor(code: ExternalParserBridgeError["code"]) {
    super(`External document parser ${code.replaceAll("_", " ")}.`);
    this.name = "ExternalParserBridgeError";
    this.code = code;
  }
}

export function createSubprocessParserBridge({
  parser,
  pythonPath,
  bridgePath,
  timeoutMs,
}: {
  readonly parser: "docling" | "mineru";
  readonly pythonPath: string;
  readonly bridgePath: string;
  readonly timeoutMs: number;
}): NativeParserBridge {
  return {
    parser,
    isAvailable: async () => {
      try {
        await Promise.all([access(pythonPath), access(bridgePath)]);
        return true;
      } catch {
        return false;
      }
    },
    parse: async (input) => await runBridge({
      bridgePath,
      input,
      parser,
      pythonPath,
      timeoutMs,
    }),
  };
}

async function runBridge({
  bridgePath,
  input,
  parser,
  pythonPath,
  timeoutMs,
}: {
  readonly bridgePath: string;
  readonly input: DocumentInput;
  readonly parser: "docling" | "mineru";
  readonly pythonPath: string;
  readonly timeoutMs: number;
}): Promise<unknown> {
  const directory = await mkdtemp(join(tmpdir(), `stay-focused-${parser}-`));
  const inputPath = join(directory, "source.pdf");
  const outputPath = join(directory, "result.json");
  try {
    await writeFile(inputPath, input.bytes);
    await execute(pythonPath, [bridgePath, "--input", inputPath, "--output", outputPath], timeoutMs);
    const outputStat = await stat(outputPath);
    if (outputStat.size > MAX_NATIVE_OUTPUT_BYTES) {
      throw new ExternalParserBridgeError("output_too_large");
    }
    const output = await readFile(outputPath, "utf8");
    try {
      return JSON.parse(output) as unknown;
    } catch {
      throw new ExternalParserBridgeError("invalid_output");
    }
  } finally {
    await rm(directory, { recursive: true, force: true }).catch(() => undefined);
  }
}

async function execute(executable: string, args: readonly string[], timeoutMs: number): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const child = spawn(executable, args, {
      env: process.env,
      shell: false,
      stdio: ["ignore", "ignore", "pipe"],
      windowsHide: true,
    });
    let stderrBytes = 0;
    let settled = false;
    const finish = (error?: ExternalParserBridgeError): void => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      if (error) reject(error);
      else resolve();
    };
    const timer = setTimeout(() => {
      terminateProcessTree(child);
      finish(new ExternalParserBridgeError("timeout"));
    }, timeoutMs);
    child.stderr.on("data", (chunk: Buffer) => {
      stderrBytes += chunk.byteLength;
      if (stderrBytes > 64 * 1024) {
        terminateProcessTree(child);
        finish(new ExternalParserBridgeError("execution_failed"));
      }
    });
    child.once("error", () => {
      finish(new ExternalParserBridgeError("execution_failed"));
    });
    child.once("exit", (code) => {
      finish(code === 0 ? undefined : new ExternalParserBridgeError("execution_failed"));
    });
  });
}

function terminateProcessTree(child: { readonly pid?: number; kill(): boolean }): void {
  if (process.platform === "win32" && child.pid) {
    const terminator = spawn(
      "taskkill",
      ["/pid", String(child.pid), "/T", "/F"],
      { shell: false, stdio: "ignore", windowsHide: true },
    );
    terminator.unref();
    return;
  }
  child.kill();
}
