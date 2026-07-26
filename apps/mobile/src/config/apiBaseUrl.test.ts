import { describe, expect, it } from "vitest";

import { resolveApiBaseUrl } from "./apiBaseUrlResolution";

describe("resolveApiBaseUrl", () => {
  it("preserves an explicit deployed API URL", () => {
    expect(
      resolveApiBaseUrl({
        configuredValue: "https://api.example.test///",
        expoHostUri: "192.168.100.30:8081",
        isDevelopment: false,
        platform: "ios",
      }),
    ).toBe("https://api.example.test");
  });

  it("derives the local API from the current Expo LAN host", () => {
    expect(
      resolveApiBaseUrl({
        configuredValue: "auto",
        expoHostUri: "192.168.68.106:8081",
        isDevelopment: true,
        platform: "ios",
      }),
    ).toBe("http://192.168.68.106:3000");
  });

  it("supports a custom local API port", () => {
    expect(
      resolveApiBaseUrl({
        configuredValue: "auto",
        expoHostUri: "exp://10.0.0.24:8081",
        isDevelopment: true,
        localApiPort: 3_001,
        platform: "android",
      }),
    ).toBe("http://10.0.0.24:3001");
  });

  it("uses localhost for Expo Web development", () => {
    expect(
      resolveApiBaseUrl({
        configuredValue: "auto",
        expoHostUri: null,
        isDevelopment: true,
        platform: "web",
      }),
    ).toBe("http://localhost:3000");
  });

  it("does not mistake an Expo tunnel host for an API tunnel", () => {
    expect(
      resolveApiBaseUrl({
        configuredValue: "auto",
        expoHostUri: "example.exp.direct:443",
        isDevelopment: true,
        platform: "ios",
      }),
    ).toBeUndefined();
  });

  it("requires an explicit API URL outside development", () => {
    expect(
      resolveApiBaseUrl({
        configuredValue: "auto",
        expoHostUri: "192.168.68.106:8081",
        isDevelopment: false,
        platform: "ios",
      }),
    ).toBeUndefined();
  });

  it("rejects an invalid custom local port", () => {
    expect(
      resolveApiBaseUrl({
        configuredValue: "auto",
        expoHostUri: "192.168.68.106:8081",
        isDevelopment: true,
        localApiPort: Number.NaN,
        platform: "ios",
      }),
    ).toBeUndefined();
  });
});
