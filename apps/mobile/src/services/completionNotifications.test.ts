import { beforeEach, expect, it, vi } from "vitest";
const native = vi.hoisted(() => ({ channel: vi.fn(), permissions: vi.fn(), request: vi.fn(), token: vi.fn(), fetch: vi.fn(), last:vi.fn(), response:vi.fn(), clear:vi.fn(), remove:vi.fn() }));
vi.mock("expo-constants", () => ({ default: { executionEnvironment: "standalone", expoConfig: { extra: { eas: { projectId: "linked-project" } } } } }));
vi.mock("expo-device", () => ({ isDevice: true }));
vi.mock("react-native", () => ({ Platform: { OS: "android" } }));
vi.mock("expo-notifications", () => ({ setNotificationHandler: vi.fn(), AndroidImportance: { DEFAULT: 3 }, setNotificationChannelAsync: native.channel, getPermissionsAsync: native.permissions, requestPermissionsAsync: native.request, getExpoPushTokenAsync: native.token, getLastNotificationResponseAsync:native.last,addNotificationResponseReceivedListener:native.response,clearLastNotificationResponseAsync:native.clear }));
vi.mock("expo-secure-store", () => ({ getItemAsync: vi.fn(async () => "11111111-1111-4111-8111-111111111111"), setItemAsync: vi.fn() }));
import { enableCompletionNotifications,subscribeToProcessingNotificationResponses } from "./completionNotifications";
const input = { apiBaseUrl: "https://api.example.test", accessToken: "fictional-test-token" };
beforeEach(() => {
  vi.resetAllMocks(); vi.stubGlobal("fetch", native.fetch);
  native.channel.mockResolvedValue(undefined); native.permissions.mockResolvedValue({ status: "granted" });
  native.token.mockResolvedValue({ data: "ExpoPushToken[fixture]" });
  native.fetch.mockResolvedValue({ ok: true, json: async () => ({ ok: true }) });
});
it("creates the Android channel before permission and token registration", async () => {
  expect((await enableCompletionNotifications(input)).ok).toBe(true);
  expect(native.channel.mock.invocationCallOrder[0]).toBeLessThan(native.permissions.mock.invocationCallOrder[0]);
  expect(native.permissions.mock.invocationCallOrder[0]).toBeLessThan(native.token.mock.invocationCallOrder[0]);
  expect(native.fetch).toHaveBeenCalledOnce();
});
it("denied permission never registers a token or account device", async () => {
  native.permissions.mockResolvedValue({ status: "denied" }); native.request.mockResolvedValue({ status: "denied" });
  expect(await enableCompletionNotifications(input)).toMatchObject({ ok: false });
  expect(native.token).not.toHaveBeenCalled(); expect(native.fetch).not.toHaveBeenCalled();
});
it("native token/configuration failures return a retryable message", async () => {
  native.token.mockRejectedValue(new Error("PRIVATE PROVIDER ERROR"));
  const result = await enableCompletionNotifications(input);
  expect(result).toMatchObject({ ok: false }); expect(JSON.stringify(result)).not.toContain("PRIVATE");
});

it('deduplicates cold and listener notification responses, clears the consumed response, and fences removed subscriptions',async()=>{
  const result={actionIdentifier:'default',notification:{request:{identifier:'receipt-1',content:{data:{screen:'processing',jobId:'job-1'}}}}};
  let resolve!:(value:unknown)=>void;native.last.mockReturnValue(new Promise(r=>{resolve=r;}));native.response.mockReturnValue({remove:native.remove});native.clear.mockResolvedValue(undefined);
  const callback=vi.fn(),subscription=subscribeToProcessingNotificationResponses(callback);
  const listener=native.response.mock.calls[0]![0];listener(result);resolve(result);await Promise.resolve();await Promise.resolve();
  expect(callback).toHaveBeenCalledOnce();expect(native.clear).toHaveBeenCalledOnce();subscription.remove();listener({...result,actionIdentifier:'other'});expect(callback).toHaveBeenCalledOnce();
  expect(native.remove).toHaveBeenCalledOnce();
});
it('ignores a last response that resolves after its subscription is removed',async()=>{
  let resolve!:(value:unknown)=>void;native.last.mockReturnValue(new Promise(r=>{resolve=r;}));native.response.mockReturnValue({remove:native.remove});
  const callback=vi.fn(),subscription=subscribeToProcessingNotificationResponses(callback);subscription.remove();
  resolve({actionIdentifier:'default',notification:{request:{identifier:'late',content:{data:{screen:'processing'}}}}});await Promise.resolve();await Promise.resolve();expect(callback).not.toHaveBeenCalled();
});
