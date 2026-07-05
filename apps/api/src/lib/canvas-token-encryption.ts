import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
} from "node:crypto";

const ALGORITHM = "aes-256-gcm";
export const CANVAS_TOKEN_ENCRYPTION_VERSION = "aes-256-gcm:v1";
const IV_BYTES = 12;
const KEY_BYTES = 32;

export type CanvasTokenEncryptionErrorCode =
  | "missing_key"
  | "invalid_key"
  | "invalid_payload"
  | "unsupported_version"
  | "decryption_failed";

export interface EncryptedCanvasToken {
  readonly ciphertext: string;
  readonly iv: string;
  readonly authTag: string;
  readonly encryptionVersion: typeof CANVAS_TOKEN_ENCRYPTION_VERSION;
}

export class CanvasTokenEncryptionError extends Error {
  public readonly code: CanvasTokenEncryptionErrorCode;

  public constructor(code: CanvasTokenEncryptionErrorCode, message: string) {
    super(message);
    this.name = "CanvasTokenEncryptionError";
    this.code = code;
  }
}

export function encryptCanvasToken(
  plaintextToken: string,
  encodedKey = process.env.CANVAS_TOKEN_ENCRYPTION_KEY,
): EncryptedCanvasToken {
  const key = decodeCanvasTokenEncryptionKey(encodedKey);
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  const ciphertext = Buffer.concat([
    cipher.update(plaintextToken, "utf8"),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();

  return {
    ciphertext: ciphertext.toString("base64"),
    iv: iv.toString("base64"),
    authTag: authTag.toString("base64"),
    encryptionVersion: CANVAS_TOKEN_ENCRYPTION_VERSION,
  };
}

export function decryptCanvasToken(
  encrypted: {
    readonly ciphertext: string;
    readonly iv: string;
    readonly authTag: string;
    readonly encryptionVersion: string;
  },
  encodedKey = process.env.CANVAS_TOKEN_ENCRYPTION_KEY,
): string {
  if (encrypted.encryptionVersion !== CANVAS_TOKEN_ENCRYPTION_VERSION) {
    throw new CanvasTokenEncryptionError(
      "unsupported_version",
      "Canvas token encryption version is not supported.",
    );
  }

  const key = decodeCanvasTokenEncryptionKey(encodedKey);
  const ciphertext = decodeBase64Field(encrypted.ciphertext);
  const iv = decodeBase64Field(encrypted.iv);
  const authTag = decodeBase64Field(encrypted.authTag);

  if (iv.length !== IV_BYTES || authTag.length === 0 || ciphertext.length === 0) {
    throw new CanvasTokenEncryptionError(
      "invalid_payload",
      "Encrypted Canvas token payload is invalid.",
    );
  }

  try {
    const decipher = createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);
    return Buffer.concat([
      decipher.update(ciphertext),
      decipher.final(),
    ]).toString("utf8");
  } catch {
    throw new CanvasTokenEncryptionError(
      "decryption_failed",
      "Encrypted Canvas token could not be decrypted.",
    );
  }
}

function decodeCanvasTokenEncryptionKey(
  encodedKey: string | undefined,
): Buffer {
  const trimmed = encodedKey?.trim();
  if (!trimmed) {
    throw new CanvasTokenEncryptionError(
      "missing_key",
      "Canvas token encryption key is not configured.",
    );
  }

  const decoded = Buffer.from(trimmed, "base64");
  if (decoded.length !== KEY_BYTES) {
    throw new CanvasTokenEncryptionError(
      "invalid_key",
      "Canvas token encryption key must decode to 32 bytes.",
    );
  }
  return decoded;
}

function decodeBase64Field(value: string): Buffer {
  try {
    return Buffer.from(value, "base64");
  } catch {
    throw new CanvasTokenEncryptionError(
      "invalid_payload",
      "Encrypted Canvas token payload is invalid.",
    );
  }
}
