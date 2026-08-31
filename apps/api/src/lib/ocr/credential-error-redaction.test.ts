import { describe, expect, it } from "vitest";

import { safeErrorMessage } from "./credential-error-redaction";

const PRIVATE_KEY_SENTINEL = "TEST_PRIVATE_KEY_SENTINEL";
const CLIENT_EMAIL_SENTINEL = "TEST_CLIENT_EMAIL_SENTINEL";
const FALLBACK = "OCR processing failed safely.";

describe("safeErrorMessage", () => {
  it("replaces credential-bearing JSON errors wholesale", () => {
    const error = new Error(
      `ENOENT: open '{"private_key":"${PRIVATE_KEY_SENTINEL}","client_email":"${CLIENT_EMAIL_SENTINEL}"}'`,
    );

    const message = safeErrorMessage(error, FALLBACK);

    expect(message).toBe(FALLBACK);
    expect(message).not.toContain(PRIVATE_KEY_SENTINEL);
    expect(message).not.toContain(CLIENT_EMAIL_SENTINEL);
  });

  it("replaces private-key, bearer-token, and token-field errors", () => {
    const sensitiveErrors = [
      new Error("-----BEGIN PRIVATE KEY----- sentinel"),
      new Error("Authorization: Bearer TEST_BEARER_TOKEN_SENTINEL"),
      new Error('access_token="TEST_ACCESS_TOKEN_SENTINEL"'),
      new Error("GOOGLE_CLOUD_CREDENTIALS_JSON={sentinel}"),
    ];

    expect(
      sensitiveErrors.map((error) => safeErrorMessage(error, FALLBACK)),
    ).toEqual(sensitiveErrors.map(() => FALLBACK));
  });

  it("preserves useful non-sensitive diagnostics", () => {
    expect(
      safeErrorMessage(new Error("PDF page count did not match."), FALLBACK),
    ).toBe("PDF page count did not match.");
  });

  it("uses the fallback for non-error values", () => {
    expect(safeErrorMessage({ private_key: PRIVATE_KEY_SENTINEL }, FALLBACK)).toBe(
      FALLBACK,
    );
  });
});
