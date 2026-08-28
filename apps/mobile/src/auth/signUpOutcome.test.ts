import { describe, expect, it } from "vitest";

import { classifySignUpResult } from "./signUpOutcome";

describe("classifySignUpResult", () => {
  it("treats a returned session as an immediately usable account", () => {
    expect(classifySignUpResult({ hasSession: true, hasUser: true })).toBe("signedIn");
  });

  it("treats a user without a session as awaiting email confirmation", () => {
    expect(classifySignUpResult({ hasSession: false, hasUser: true })).toBe(
      "confirmationRequired",
    );
  });

  it("reports an unusable response rather than guessing an outcome", () => {
    expect(classifySignUpResult({ hasSession: false, hasUser: false })).toBe("unknown");
  });

  it("prefers the session even if the project's confirmation setting changes", () => {
    // The classifier must not depend on a build-time assumption about whether
    // confirmation is enabled; a session always wins.
    expect(classifySignUpResult({ hasSession: true, hasUser: false })).toBe("signedIn");
  });
});
