const SENSITIVE_CREDENTIAL_PATTERNS = [
  /-----BEGIN [A-Z ]*PRIVATE KEY-----/i,
  /["']?private_key(?:_id)?["']?\s*[:=]/i,
  /["']?client_email["']?\s*[:=]/i,
  /GOOGLE_CLOUD_CREDENTIALS_JSON\s*=/i,
  /\b(?:authorization\s*:\s*)?bearer\s+[a-z0-9._~+/=-]{8,}/i,
  /["']?(?:access|refresh|id)_token["']?\s*[:=]/i,
] as const;

export function safeErrorMessage(
  error: unknown,
  fallback: string,
): string {
  const candidate = error instanceof Error ? error.message.trim() : "";
  if (!candidate || containsCredentialMaterial(candidate)) {
    return fallback;
  }
  return candidate;
}

function containsCredentialMaterial(value: string): boolean {
  return SENSITIVE_CREDENTIAL_PATTERNS.some((pattern) => pattern.test(value));
}
