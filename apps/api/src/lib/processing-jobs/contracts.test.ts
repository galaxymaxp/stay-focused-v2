import { describe, expect, it } from "vitest";

import {
  createGenerationRequestFingerprint,
  createGenerationSettingsFingerprint,
  DOCUMENT_PARSER_POLICY_VERSION,
  REVIEWER_GENERATION_POLICY_VERSION,
} from "./contracts";

describe("processing provenance fingerprints", () => {
  it("reuses an identical neutral generation contract deterministically", () => {
    const settings = createGenerationSettingsFingerprint({
      artifactType: "reviewer",
      language: "auto",
      outputMode: "standard",
    });
    expect(
      createGenerationRequestFingerprint({
        sourceContentSha256: "a".repeat(64),
        sourceTitle: "Cell structure",
        settingsFingerprint: settings,
      }),
    ).toBe(
      createGenerationRequestFingerprint({
        sourceContentSha256: "a".repeat(64),
        sourceTitle: "Cell structure",
        settingsFingerprint: settings,
      }),
    );
  });

  it("changes the fingerprint when user-controlled settings change", () => {
    const standard = createGenerationSettingsFingerprint({
      artifactType: "reviewer",
      language: "auto",
      outputMode: "standard",
    });
    const concise = createGenerationSettingsFingerprint({
      artifactType: "reviewer",
      language: "auto",
      outputMode: "concise",
    });
    expect(standard).not.toBe(concise);
  });

  it("treats explicit artifact reuse as a distinct idempotent request", () => {
    const settings = createGenerationSettingsFingerprint({
      artifactType: "reviewer",
      language: "auto",
      outputMode: "standard",
    });
    const fresh = createGenerationRequestFingerprint({
      reuseMode: "fresh",
      settingsFingerprint: settings,
      sourceContentSha256: "c".repeat(64),
    });
    const reuse = createGenerationRequestFingerprint({
      reuseMode: "reuse_existing",
      settingsFingerprint: settings,
      sourceContentSha256: "c".repeat(64),
    });

    expect(fresh).not.toBe(reuse);
  });

  it("uses explicit policy versions instead of private prompts", () => {
    expect(DOCUMENT_PARSER_POLICY_VERSION).toMatch(/^document-parser-v\d+$/);
    expect(REVIEWER_GENERATION_POLICY_VERSION).toMatch(/^reviewer-policy-v\d+$/);
  });

  it.each([
    ["Biology", "Photosynthesis and cellular respiration"],
    ["History", "Trade routes in the early modern period"],
    ["Technical documentation", "Hydraulic pump maintenance procedure"],
  ])("applies the same neutral provenance contract to %s", (_kind, sourceTitle) => {
    const settings = createGenerationSettingsFingerprint({
      artifactType: "reviewer",
      language: "auto",
      outputMode: "standard",
    });
    const fingerprint = createGenerationRequestFingerprint({
      sourceContentSha256: "b".repeat(64),
      sourceTitle,
      settingsFingerprint: settings,
    });

    expect(fingerprint).toMatch(/^[a-f0-9]{64}$/);
  });
});
