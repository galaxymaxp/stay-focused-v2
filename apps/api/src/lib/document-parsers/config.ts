import type { DocumentParserMode } from "@stay-focused/engine";

export interface DocumentParserConfig {
  readonly mode: DocumentParserMode;
  readonly timeoutMs: number;
  readonly docling?: {
    readonly pythonPath: string;
    readonly bridgePath: string;
  };
  readonly mineru?: {
    readonly pythonPath: string;
    readonly bridgePath: string;
  };
}

const DEFAULT_TIMEOUT_MS = 10 * 60 * 1_000;
const MIN_TIMEOUT_MS = 1_000;
const MAX_TIMEOUT_MS = 30 * 60 * 1_000;

export function readDocumentParserConfig(
  environment: Readonly<Record<string, string | undefined>> = process.env,
): DocumentParserConfig {
  const requestedMode = environment.DOCUMENT_PARSER_MODE?.trim().toLowerCase();
  const mode: DocumentParserMode = requestedMode === "docling" || requestedMode === "hybrid"
    ? requestedMode
    : "legacy";
  const timeout = Number(environment.DOCUMENT_PARSER_TIMEOUT_MS);
  const timeoutMs = Number.isFinite(timeout)
    ? Math.min(MAX_TIMEOUT_MS, Math.max(MIN_TIMEOUT_MS, Math.trunc(timeout)))
    : DEFAULT_TIMEOUT_MS;
  const docling = readBridgeConfig(
    environment.DOCLING_PYTHON_PATH,
    environment.DOCLING_PARSER_BRIDGE_PATH,
  );
  const mineru = readBridgeConfig(
    environment.MINERU_PYTHON_PATH,
    environment.MINERU_PARSER_BRIDGE_PATH,
  );
  return { mode, timeoutMs, ...(docling ? { docling } : {}), ...(mineru ? { mineru } : {}) };
}

function readBridgeConfig(
  pythonPath: string | undefined,
  bridgePath: string | undefined,
): { readonly pythonPath: string; readonly bridgePath: string } | undefined {
  const python = pythonPath?.trim();
  const bridge = bridgePath?.trim();
  return python && bridge ? { pythonPath: python, bridgePath: bridge } : undefined;
}
