import { beforeEach, expect, it, vi } from "vitest";
import { sessionStore } from "./sessionStore";
const mocks = vi.hoisted(() => ({ values: new Map<string, string>(), failKey: "" }));
vi.mock("react-native", () => ({ Platform: { OS: "android" } }));
vi.mock("expo-secure-store", () => ({
  WHEN_UNLOCKED_THIS_DEVICE_ONLY: 1,
  getItemAsync: async (key: string) => mocks.values.get(key) ?? null,
  setItemAsync: async (key: string, value: string) => { if (key === mocks.failKey) throw Error("interrupted write"); mocks.values.set(key, value); },
  deleteItemAsync: async (key: string) => { mocks.values.delete(key); },
}));
beforeEach(() => { mocks.values.clear(); mocks.failKey = ""; });
it("preserves the old single value when its replacement cannot be committed", async () => {
  await sessionStore.setItem("auth", "saved");
  mocks.failKey = "auth";
  await expect(sessionStore.setItem("auth", "replacement")).rejects.toThrow();
  expect(await sessionStore.getItem("auth")).toBe("saved");
});
it("preserves complete old chunks when a refresh dies before the manifest write", async () => {
  const previous = "a".repeat(4000);
  await sessionStore.setItem("auth", previous);
  mocks.failKey = "auth";
  await expect(sessionStore.setItem("auth", "b".repeat(6000))).rejects.toThrow();
  expect(await sessionStore.getItem("auth")).toBe(previous);
  mocks.failKey = "";
  await sessionStore.setItem("auth", "c".repeat(2000));
  expect(await sessionStore.getItem("auth")).toBe("c".repeat(2000));
});
it("keeps legacy sessions readable and upgrades them without a sign-in", async () => {
  mocks.values.set("auth", "chunked-v1:2");
  mocks.values.set("auth.0", "old-"); mocks.values.set("auth.1", "session");
  expect(await sessionStore.getItem("auth")).toBe("old-session");
  await sessionStore.setItem("auth", "new".repeat(1000));
  expect(await sessionStore.getItem("auth")).toBe("new".repeat(1000));
  expect(mocks.values.has("auth.0")).toBe(false);
  await sessionStore.removeItem("auth");
  expect(await sessionStore.getItem("auth")).toBeNull();
  expect(mocks.values.size).toBe(0);
});
it("serializes simultaneous writes so their banks and reads cannot interleave", async () => {
  const a = "a".repeat(3000), b = "b".repeat(5000);
  await Promise.all([sessionStore.setItem("auth", a), sessionStore.setItem("auth", b)]);
  expect(await sessionStore.getItem("auth")).toBe(b);
});
it("rejects an oversized replacement without deleting the saved session", async () => {
  await sessionStore.setItem("auth", "saved");
  await expect(sessionStore.setItem("auth", "x".repeat(1800 * 65))).rejects.toThrow();
  expect(await sessionStore.getItem("auth")).toBe("saved");
});
