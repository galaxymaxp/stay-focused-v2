import { afterEach, describe, expect, it, vi } from "vitest";
import { verifyBearerToken } from "./auth";
const mocks = vi.hoisted(() => ({ getUser: vi.fn(), rpc: vi.fn() }));
vi.mock("@supabase/supabase-js", () => ({ createClient: () => ({ auth: { getUser: mocks.getUser }, rpc: mocks.rpc }) }));
afterEach(() => { vi.unstubAllEnvs(); vi.resetAllMocks(); });
function setup() {
  vi.stubEnv("SUPABASE_URL", "https://local.invalid");
  vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "local-test");
  mocks.getUser.mockResolvedValue({ data: { user: { id: "verified-owner" } }, error: null });
  mocks.rpc.mockResolvedValue({ error: null });
  return new Request("https://local.invalid", { headers: { authorization: "Bearer verified-jwt" } });
}
describe("verified bearer API activity", () => {
  it("records the verified identity after authentication", async () => {
    expect(await verifyBearerToken(setup())).toEqual({ id: "verified-owner" });
    expect(mocks.getUser).toHaveBeenCalledWith("verified-jwt");
    expect(mocks.rpc).toHaveBeenCalledWith("record_canvas_api_activity_v1", { p_user_id: "verified-owner" });
  });
  it("does not record invalid or absent bearer identities", async () => {
    const request = setup();
    mocks.getUser.mockResolvedValue({ data: { user: null }, error: { message: "invalid" } });
    expect(await verifyBearerToken(request)).toBeNull();
    expect(await verifyBearerToken(new Request("https://local.invalid"))).toBeNull();
    expect(mocks.rpc).not.toHaveBeenCalled();
  });
  it.each(["response", "throw"])("retains valid authentication when activity fails via %s", async mode => {
    const request = setup();
    if (mode === "throw") mocks.rpc.mockRejectedValue(new Error("private"));
    else mocks.rpc.mockResolvedValue({ error: { message: "private" } });
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(await verifyBearerToken(request)).toEqual({ id: "verified-owner" });
    expect(log).toHaveBeenCalledWith("auto_reviewers.activity_unavailable");
  });
});
