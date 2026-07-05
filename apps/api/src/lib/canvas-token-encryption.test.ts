import { randomBytes } from "node:crypto";

import { describe, expect, it } from "vitest";

import {
  CANVAS_TOKEN_ENCRYPTION_VERSION,
  CanvasTokenEncryptionError,
  decodeCanvasTokenEncryptionKey,
  decryptCanvasToken,
  encryptCanvasToken,
} from "./canvas-token-encryption";

const KEY = randomBytes(32).toString("base64");

describe("Canvas token encryption", () => {
  it("accepts valid canonical Base64 keys", () => {
    const decoded = decodeCanvasTokenEncryptionKey(KEY);

    expect(decoded).toHaveLength(32);
    expect(decoded.toString("base64")).toBe(KEY);
  });

  it("keeps the canonical Base64 key round trip unambiguous", () => {
    expect(decodeCanvasTokenEncryptionKey(KEY).toString("base64")).toBe(KEY);
  });

  it("accepts surrounding whitespace around the configured key only", () => {
    expect(decodeCanvasTokenEncryptionKey(`\n ${KEY}\t`).toString("base64"))
      .toBe(KEY);
  });

  it.each([
    ["malformed trailing characters", `${KEY}!!!`],
    ["invalid characters", `-${KEY.slice(1)}`],
    ["invalid padding", `${KEY.slice(0, -2)}=A`],
    ["invalid Base64 length", KEY.slice(0, -1)],
    ["wrong decoded byte length", randomBytes(16).toString("base64")],
  ])("rejects %s", (_caseName, value) => {
    expect(() => decodeCanvasTokenEncryptionKey(value)).toThrow(
      CanvasTokenEncryptionError,
    );
  });

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

  it("rejects malformed ciphertext encoding", () => {
    const encrypted = encryptCanvasToken("token", KEY);

    expect(() =>
      decryptCanvasToken({ ...encrypted, ciphertext: `${encrypted.ciphertext}!` }, KEY),
    ).toThrow(CanvasTokenEncryptionError);
  });

  it("rejects malformed IV encoding", () => {
    const encrypted = encryptCanvasToken("token", KEY);

    expect(() =>
      decryptCanvasToken({ ...encrypted, iv: `${encrypted.iv}!` }, KEY),
    ).toThrow(CanvasTokenEncryptionError);
  });

  it("rejects IV values with the wrong decoded byte length", () => {
    const encrypted = encryptCanvasToken("token", KEY);

    expect(() =>
      decryptCanvasToken(
        { ...encrypted, iv: randomBytes(16).toString("base64") },
        KEY,
      ),
    ).toThrow(CanvasTokenEncryptionError);
  });

  it("rejects malformed authentication-tag encoding", () => {
    const encrypted = encryptCanvasToken("token", KEY);

    expect(() =>
      decryptCanvasToken({ ...encrypted, authTag: `${encrypted.authTag}!` }, KEY),
    ).toThrow(CanvasTokenEncryptionError);
  });

  it("rejects authentication tags with the wrong decoded byte length", () => {
    const encrypted = encryptCanvasToken("token", KEY);

    expect(() =>
      decryptCanvasToken(
        { ...encrypted, authTag: randomBytes(12).toString("base64") },
        KEY,
      ),
    ).toThrow(CanvasTokenEncryptionError);
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
