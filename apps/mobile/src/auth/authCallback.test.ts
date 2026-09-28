import { describe, expect, it } from "vitest";
import { parseAuthCallback } from "./authCallback";

describe("mobile auth callback boundary", () => {
  it.each(["stayfocused://auth/callback?code=one", "stayfocused:///auth/callback?code=one"])("accepts exact callback %s", (url) => {
    expect(parseAuthCallback(url)).toEqual({ kind: "code", code: "one", recovery: false });
  });
  it("recognizes password recovery", () => {
    expect(parseAuthCallback("stayfocused://auth/callback?code=one&mode=recovery")).toEqual({ kind: "code", code: "one", recovery: true });
  });
  it.each(["https://auth/callback?code=one", "stayfocused://evil/callback?code=one", "stayfocused://auth/callback/extra?code=one", "stayfocused://user:secret@auth/callback?code=one", "broken"])("ignores unrelated/malformed URL %s", (url) => {
    expect(parseAuthCallback(url).kind).toBe("ignored");
  });
  it.each(["?code=one&code=two", "?code=", "?error=access_denied&error_description=PRIVATE", "#access_token=PRIVATE&refresh_token=PRIVATE"])("rejects ambiguous/error/token callback %s", (suffix) => {
    expect(parseAuthCallback("stayfocused://auth/callback" + suffix)).toEqual({ kind: "error" });
  });
});
