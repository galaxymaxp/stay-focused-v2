import type { GeneratedArtifactType } from "@stay-focused/shared";
import { createHash } from "node:crypto";

export const DOCUMENT_PARSER_POLICY_VERSION = "document-parser-v2";
export const OCR_POLICY_VERSION = "ocr-policy-v2";
export const DOCUMENT_NORMALIZATION_VERSION = "document-normalization-v1";

export const REVIEWER_GENERATION_POLICY_VERSION = "reviewer-policy-v1";
export const REVIEWER_ENGINE_VERSION = "engine-stage0-6-v1";
export const REVIEWER_SCHEMA_VERSION = "reviewer-output-v1";
export const REVIEWER_PROVIDER_ID = "openai:gpt-4o";

export type GenerationReuseMode = "fresh" | "reuse_existing";

export interface GenerationSettings {
  readonly artifactType: GeneratedArtifactType;
  readonly language: string;
  readonly outputMode: string;
}

export function createGenerationSettingsFingerprint(
  settings: GenerationSettings,
): string {
  return sha256(
    JSON.stringify({
      artifactType: settings.artifactType,
      language: normalizeSetting(settings.language, "auto"),
      outputMode: normalizeSetting(settings.outputMode, "standard"),
    }),
  );
}

export function createGenerationRequestFingerprint(input: {
  readonly sourceContentSha256: string;
  readonly sourceTitle?: string;
  readonly settingsFingerprint: string;
  readonly reuseMode?: GenerationReuseMode;
}): string {
  return sha256(
    JSON.stringify({
      artifactType: "reviewer",
      engineVersion: REVIEWER_ENGINE_VERSION,
      generationPolicyVersion: REVIEWER_GENERATION_POLICY_VERSION,
      providerId: REVIEWER_PROVIDER_ID,
      reuseMode: input.reuseMode ?? "fresh",
      schemaVersion: REVIEWER_SCHEMA_VERSION,
      settingsFingerprint: input.settingsFingerprint,
      sourceContentSha256: input.sourceContentSha256,
      sourceTitle: input.sourceTitle?.trim() ?? "",
    }),
  );
}

export function sha256Bytes(bytes: Uint8Array): string {
  return createHash("sha256").update(bytes).digest("hex");
}

export function sha256Text(value: string): string {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

function sha256(value: string): string {
  return sha256Text(value);
}

function normalizeSetting(value: string, fallback: string): string {
  const normalized = value.trim().toLowerCase();
  return normalized || fallback;
}
