const AUTO_API_BASE_URL = "auto";
const DEFAULT_LOCAL_API_PORT = 3_000;

interface ApiBaseUrlResolutionInput {
  readonly configuredValue?: string;
  readonly expoHostUri?: string | null;
  readonly isDevelopment: boolean;
  readonly localApiPort?: number;
  readonly platform: string;
}

export const API_CONFIGURATION_MESSAGE =
  "This version of Stay Focused is missing its server connection configuration. Please install or update to a correctly configured build.";

export class ApiConfigurationError extends Error {
  readonly kind = "configuration";

  constructor(readonly code: "missing_api_base_url" | "invalid_api_base_url") {
    super(API_CONFIGURATION_MESSAGE);
    this.name = "ApiConfigurationError";
  }
}

/** Validate before constructing a request. The message never contains the input. */
export function requireApiBaseUrl(value: string | undefined): string {
  const normalized = value?.trim().replace(/\/+$/, "");
  if (!normalized) throw new ApiConfigurationError("missing_api_base_url");
  try {
    const parsed = new URL(normalized);
    if (
      !["http:", "https:"].includes(parsed.protocol) ||
      !parsed.hostname ||
      parsed.username ||
      parsed.password ||
      parsed.search ||
      parsed.hash ||
      parsed.pathname !== "/"
    ) throw new Error("invalid");
  } catch {
    throw new ApiConfigurationError("invalid_api_base_url");
  }
  return normalized;
}

/**
 * Resolves an explicit deployed API URL or a same-network local development URL.
 *
 * Expo Go publishes the Metro host in `expoConfig.hostUri`. In LAN mode that
 * host is the laptop's current address, so local testing can follow Wi-Fi
 * changes without embedding an address in source or `.env.local`.
 */
export function resolveApiBaseUrl(
  input: ApiBaseUrlResolutionInput,
): string | undefined {
  const configuredValue = input.configuredValue?.trim();
  if (
    configuredValue &&
    configuredValue.toLowerCase() !== AUTO_API_BASE_URL
  ) {
    try {
      return requireApiBaseUrl(configuredValue);
    } catch {
      return undefined;
    }
  }

  if (!input.isDevelopment) return undefined;

  const localApiPort = input.localApiPort ?? DEFAULT_LOCAL_API_PORT;
  if (!Number.isInteger(localApiPort) || localApiPort < 1 || localApiPort > 65_535) {
    return undefined;
  }

  if (input.platform === "web") {
    return `http://localhost:${localApiPort}`;
  }

  const host = readHost(input.expoHostUri);
  if (!host || !isLocalDevelopmentHost(host)) return undefined;

  const formattedHost = host.includes(":") ? `[${host}]` : host;
  return `http://${formattedHost}:${localApiPort}`;
}

function readHost(hostUri: string | null | undefined): string | undefined {
  const normalized = hostUri?.trim();
  if (!normalized) return undefined;

  try {
    const parsed = new URL(
      /^[a-z][a-z\d+.-]*:\/\//iu.test(normalized)
        ? normalized
        : `http://${normalized}`,
    );
    return parsed.hostname.replace(/^\[|\]$/gu, "");
  } catch {
    return undefined;
  }
}

function isLocalDevelopmentHost(host: string): boolean {
  const normalized = host.toLowerCase();
  if (
    normalized === "localhost" ||
    normalized.endsWith(".local") ||
    normalized === "::1" ||
    normalized.startsWith("fc") ||
    normalized.startsWith("fd") ||
    normalized.startsWith("fe80:")
  ) {
    return true;
  }

  const octets = normalized.split(".").map(Number);
  if (
    octets.length !== 4 ||
    octets.some(
      (octet) => !Number.isInteger(octet) || octet < 0 || octet > 255,
    )
  ) {
    return false;
  }

  return (
    octets[0] === 10 ||
    octets[0] === 127 ||
    (octets[0] === 172 && octets[1] >= 16 && octets[1] <= 31) ||
    (octets[0] === 192 && octets[1] === 168)
  );
}
