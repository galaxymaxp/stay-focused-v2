import { randomBytes } from "node:crypto";

import { describe, expect, it } from "vitest";

import {
  CANVAS_TOKEN_ENCRYPTION_VERSION,
  CanvasTokenEncryptionError,
  decryptCanvasToken,
  encryptCanvasToken,
} from "./canvas-token-encryption";

const KEY = randomBytes(32).toString("base64");

describe("Canvas token encryption", () => {
  it("round trips a token", () => {
    const encrypted = encryptCanvasToken("canvas-token-value", KEY);

    expect(decryptCanvasToken(encrypted, KEY)).toBe("canvas-token-value");
    expect(encrypted.encryptionVersion).toBe(CANVAS_TOKEN_ENCRYPTION_VERSION);
    expect(JSON.stringify(encrypted)).not.toContain("canvas-token-value");
  });

  it("uses randomized ciphertext", () => {
    const first = encryptCanvasToken("same-token", KEY);
    const second = encryptCanvasToken("same-token", KEY);

    expect(first.ciphertext).not.toBe(second.ciphertext);
    expect(first.iv).not.toBe(second.iv);
  });

  it("rejects invalid key length", () => {
    expect(() => encryptCanvasToken("token", randomBytes(16).toString("base64")))
      .toThrow(CanvasTokenEncryptionError);
  });

  it("fails closed for corrupted ciphertext", () => {
    const encrypted = encryptCanvasToken("token", KEY);

    expect(() =>
      decryptCanvasToken({ ...encrypted, ciphertext: "AAAA" }, KEY),
    ).toThrow(CanvasTokenEncryptionError);
  });

  it("fails closed for corrupted authentication tags", () => {
    const encrypted = encryptCanvasToken("token", KEY);

    expect(() =>
      decryptCanvasToken(
        { ...encrypted, authTag: randomBytes(16).toString("base64") },
        KEY,
      ),
    ).toThrow(CanvasTokenEncryptionError);
  });

  it("rejects unsupported encryption versions", () => {
    const encrypted = encryptCanvasToken("token", KEY);

    expect(() =>
      decryptCanvasToken({ ...encrypted, encryptionVersion: "v0" }, KEY),
    ).toThrow(CanvasTokenEncryptionError);
  });
});
