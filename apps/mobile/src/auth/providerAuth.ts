import { Linking } from "react-native";
import * as SecureStore from "expo-secure-store";
import { AUTH_CALLBACK_URL, parseAuthCallback } from "./authCallback";
import { getSupabaseClientResult } from "./supabaseClient";
import type { AuthResult, OAuthProvider } from "./authTypes";

const LINK_OWNER_KEY = "stay-focused-v2.auth.link-owner";
const completions = new Map<string, Promise<AuthResult<{ recovery: boolean }>>>();
const failure = (message: string): AuthResult<never> => ({ ok: false, error: { code: "oauth_provider_error", message } });

export async function openProviderAuth(provider: OAuthProvider, link = false): Promise<AuthResult<void>> {
  const client = getSupabaseClientResult();
  if (!client.ok) return client;
  try {
    const options = { redirectTo: AUTH_CALLBACK_URL, skipBrowserRedirect: true, ...(provider === "microsoft" ? { scopes: "email" } : {}) };
    const supabaseProvider = provider === "microsoft" ? "azure" : "google";
    if (link) {
      const { data, error } = await client.data.auth.getUser();
      if (error || !data.user) return failure("Sign in before linking another account.");
      await SecureStore.setItemAsync(LINK_OWNER_KEY, data.user.id);
    } else {
      await SecureStore.deleteItemAsync(LINK_OWNER_KEY);
    }
    const result = link
      ? await client.data.auth.linkIdentity({ provider: supabaseProvider, options })
      : await client.data.auth.signInWithOAuth({ provider: supabaseProvider, options });
    if (result.error || !result.data.url) {
      await SecureStore.deleteItemAsync(LINK_OWNER_KEY);
      return failure(result.error?.code === "manual_linking_disabled" ? "Account linking is unavailable. Ask Stay Focused support to enable it before using a different sign-in method." : "This provider could not start. Your saved work is unchanged.");
    }
    await Linking.openURL(result.data.url);
    return { ok: true, data: undefined };
  } catch {
    return failure("The sign-in browser could not be opened. Please try again.");
  }
}

export function completeAuthCallback(url: string): Promise<AuthResult<{ recovery: boolean }>> {
  const parsed = parseAuthCallback(url);
  if (parsed.kind !== "code") return Promise.resolve(failure("The sign-in link is invalid or was cancelled. Please start again."));
  const previous = completions.get(parsed.code);
  if (previous) return previous;
  const completion = exchange(parsed.code, parsed.recovery);
  completions.set(parsed.code, completion);
  if (completions.size > 20) completions.delete(completions.keys().next().value!);
  return completion;
}

async function exchange(code: string, recovery: boolean): Promise<AuthResult<{ recovery: boolean }>> {
  const client = getSupabaseClientResult();
  if (!client.ok) return client;
  try {
    // Supabase checks the PKCE verifier persisted in SecureStore by this device.
    const expectedOwner = await SecureStore.getItemAsync(LINK_OWNER_KEY);
    const { data, error } = await client.data.auth.exchangeCodeForSession(code);
    if (error || !data.session) return failure("This link expired or belongs to another device. Please start again.");
    if (expectedOwner && data.session.user.id !== expectedOwner) {
      await client.data.auth.signOut({ scope: "local" });
      return failure("The provider did not link to your account. Sign in to your original account again.");
    }
    await SecureStore.deleteItemAsync(LINK_OWNER_KEY);
    return { ok: true, data: { recovery } };
  } catch {
    return failure("Sign in could not finish. Please try again.");
  }
}

export async function requestPasswordReset(email: string): Promise<AuthResult<void>> {
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) return failure("Enter your email address first.");
  const client = getSupabaseClientResult();
  if (!client.ok) return client;
  try {
    await SecureStore.deleteItemAsync(LINK_OWNER_KEY);
    const { error } = await client.data.auth.resetPasswordForEmail(email.trim().toLowerCase(), { redirectTo: `${AUTH_CALLBACK_URL}?mode=recovery` });
    return error ? failure("A reset email could not be requested. Try again later.") : { ok: true, data: undefined };
  } catch {
    return failure("A reset email could not be requested. Check your connection.");
  }
}

export async function updateRecoveredPassword(password: string): Promise<AuthResult<void>> {
  if (password.length < 8) return failure("Use at least 8 characters for your password.");
  const client = getSupabaseClientResult();
  if (!client.ok) return client;
  try {
    const { error } = await client.data.auth.updateUser({ password });
    return error ? failure("The password could not be updated. Please request another reset link.") : { ok: true, data: undefined };
  } catch {
    return failure("The password could not be updated. Check your connection.");
  }
}
