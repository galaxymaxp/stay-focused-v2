import type { AuthError } from "@supabase/supabase-js";

import type {
  AuthErrorCode,
  AuthProvider,
  AuthResult,
  AuthRole,
  AuthRoleClaims,
  AuthStateChangeCallback,
  AuthStateSubscription,
  MobileAuthSession,
  OAuthProvider,
  OAuthSignInOptions,
  OAuthSignInStart,
  SupabaseOAuthProvider,
  SupabaseSession,
  SupabaseUser,
} from "./authTypes";
import { getSupabaseClientResult } from "./supabaseClient";

interface OAuthProviderConfig {
  readonly provider: OAuthProvider;
  readonly supabaseProvider: SupabaseOAuthProvider;
}

const OAUTH_PROVIDERS: Record<OAuthProvider, OAuthProviderConfig> = {
  google: {
    provider: "google",
    supabaseProvider: "google",
  },
  microsoft: {
    provider: "microsoft",
    supabaseProvider: "azure",
  },
};

export async function signInWithEmailPassword(
  email: string,
  password: string,
): Promise<AuthResult<MobileAuthSession>> {
  const normalizedEmail = email.trim().toLowerCase();
  if (!isValidEmail(normalizedEmail)) {
    return authFailure("invalid_email", "A valid email address is required.");
  }
  if (!password) {
    return authFailure("missing_password", "A password is required.");
  }

  const client = getSupabaseClientResult();
  if (!client.ok) {
    return client;
  }

  try {
    const { data, error } = await client.data.auth.signInWithPassword({
      email: normalizedEmail,
      password,
    });

    if (error) {
      return authFailureFromSupabaseError(error, "email");
    }

    if (!data.session) {
      return authFailure(
        "session_restore_failed",
        "Sign in succeeded, but no session was returned.",
      );
    }

    return { ok: true, data: toMobileAuthSession(data.session, "email") };
  } catch {
    return authFailure(
      "network_error",
      "Sign in failed before Supabase returned a response.",
    );
  }
}

export async function signOut(): Promise<AuthResult<void>> {
  const client = getSupabaseClientResult();
  if (!client.ok) {
    return client;
  }

  try {
    const { error } = await client.data.auth.signOut();
    if (error) {
      return authFailureFromSupabaseError(error, undefined, "sign_out_failed");
    }

    return { ok: true, data: undefined };
  } catch {
    return authFailure("sign_out_failed", "Sign out could not be completed.");
  }
}

export async function getCurrentSession(): Promise<
  AuthResult<MobileAuthSession | null>
> {
  const client = getSupabaseClientResult();
  if (!client.ok) {
    return client;
  }

  try {
    const { data, error } = await client.data.auth.getSession();
    if (error) {
      return authFailureFromSupabaseError(
        error,
        undefined,
        "session_restore_failed",
      );
    }

    return {
      ok: true,
      data: data.session ? toMobileAuthSession(data.session) : null,
    };
  } catch {
    return authFailure(
      "session_restore_failed",
      "The saved session could not be restored.",
    );
  }
}

export async function getAccessToken(): Promise<AuthResult<string | null>> {
  const session = await getCurrentSession();
  if (!session.ok) {
    return session;
  }

  if (!session.data) {
    return { ok: true, data: null };
  }

  const accessToken = session.data.accessToken.trim();
  if (!accessToken) {
    return authFailure(
      "token_unavailable",
      "The current session does not include an access token.",
    );
  }

  return { ok: true, data: accessToken };
}

export function onAuthStateChange(
  callback: AuthStateChangeCallback,
): AuthResult<AuthStateSubscription> {
  const client = getSupabaseClientResult();
  if (!client.ok) {
    return client;
  }

  const {
    data: { subscription },
  } = client.data.auth.onAuthStateChange((event, session) => {
    callback(event, session ? toMobileAuthSession(session) : null);
  });

  return {
    ok: true,
    data: {
      unsubscribe: () => subscription.unsubscribe(),
    },
  };
}

// Future login screens should open the returned URL with Expo AuthSession or
// WebBrowser, then let Supabase exchange the redirect callback into a session.
export async function signInWithMicrosoft(
  options: OAuthSignInOptions,
): Promise<AuthResult<OAuthSignInStart>> {
  return startOAuthSignIn(OAUTH_PROVIDERS.microsoft, options);
}

export async function signInWithGoogle(
  options: OAuthSignInOptions,
): Promise<AuthResult<OAuthSignInStart>> {
  return startOAuthSignIn(OAUTH_PROVIDERS.google, options);
}

async function startOAuthSignIn(
  providerConfig: OAuthProviderConfig,
  options: OAuthSignInOptions,
): Promise<AuthResult<OAuthSignInStart>> {
  const redirectTo = options.redirectTo.trim();
  if (!redirectTo) {
    return authFailure(
      "oauth_redirect_missing",
      "A mobile OAuth redirect URL is required.",
      undefined,
      providerConfig.provider,
    );
  }

  const client = getSupabaseClientResult();
  if (!client.ok) {
    return client;
  }

  try {
    const { data, error } = await client.data.auth.signInWithOAuth({
      provider: providerConfig.supabaseProvider,
      options: {
        redirectTo,
        scopes: options.scopes,
        queryParams: options.queryParams,
        skipBrowserRedirect: true,
      },
    });

    if (error) {
      return authFailureFromSupabaseError(
        error,
        providerConfig.provider,
        "oauth_provider_error",
      );
    }

    if (!data.url) {
      return authFailure(
        "oauth_provider_error",
        "Supabase did not return an OAuth redirect URL.",
        undefined,
        providerConfig.provider,
      );
    }

    return {
      ok: true,
      data: {
        provider: providerConfig.provider,
        supabaseProvider: providerConfig.supabaseProvider,
        url: data.url,
      },
    };
  } catch {
    return authFailure(
      "network_error",
      "OAuth sign in failed before Supabase returned a response.",
      undefined,
      providerConfig.provider,
    );
  }
}

function toMobileAuthSession(
  session: SupabaseSession,
  provider?: AuthProvider,
): MobileAuthSession {
  return {
    accessToken: session.access_token,
    expiresAt: session.expires_at ?? null,
    provider: provider ?? inferProvider(session.user),
    user: {
      id: session.user.id,
      email: session.user.email ?? null,
      phone: session.user.phone ?? null,
      appMetadata: asRecord(session.user.app_metadata),
      userMetadata: asRecord(session.user.user_metadata),
    },
    roles: extractRoleClaims(session.user),
  };
}

function extractRoleClaims(user: SupabaseUser): AuthRoleClaims {
  const appMetadata = asRecord(user.app_metadata);
  const roles = readRoles(appMetadata);

  return {
    roles,
    organizationId: readStringClaim(appMetadata, [
      "organization_id",
      "organizationId",
      "org_id",
    ]),
    schoolId: readStringClaim(appMetadata, ["school_id", "schoolId"]),
    subscriptionTier: readStringClaim(appMetadata, [
      "subscription_tier",
      "subscriptionTier",
      "plan",
    ]),
    source: roles.length > 0 ? "app_metadata" : "none",
  };
}

function readRoles(metadata: Readonly<Record<string, unknown>>): readonly AuthRole[] {
  const roles = metadata.roles;
  if (Array.isArray(roles)) {
    return roles.filter(isNonEmptyString).map((role) => role.trim());
  }

  const role = metadata.role;
  if (isNonEmptyString(role)) {
    return [role.trim()];
  }

  return [];
}

function readStringClaim(
  metadata: Readonly<Record<string, unknown>>,
  keys: readonly string[],
): string | null {
  for (const key of keys) {
    const value = metadata[key];
    if (isNonEmptyString(value)) {
      return value.trim();
    }
  }

  return null;
}

function inferProvider(user: SupabaseUser): AuthProvider {
  const identities = user.identities ?? [];
  const latestProvider = identities[identities.length - 1]?.provider;

  if (latestProvider === "google") {
    return "google";
  }
  if (latestProvider === "azure") {
    return "microsoft";
  }

  return "email";
}

function authFailure(
  code: AuthErrorCode,
  message: string,
  status?: number,
  provider?: OAuthProvider,
): AuthResult<never> {
  return {
    ok: false,
    error: {
      code,
      message,
      ...(status !== undefined ? { status } : {}),
      ...(provider ? { provider } : {}),
    },
  };
}

function authFailureFromSupabaseError(
  error: AuthError,
  provider?: AuthProvider,
  fallbackCode?: AuthErrorCode,
): AuthResult<never> {
  const code = fallbackCode ?? classifySupabaseAuthError(error);
  const oauthProvider =
    provider === "google" || provider === "microsoft" ? provider : undefined;

  return authFailure(
    code,
    messageForAuthError(code),
    error.status,
    oauthProvider,
  );
}

function classifySupabaseAuthError(error: AuthError): AuthErrorCode {
  const normalizedMessage = error.message.toLowerCase();

  if (normalizedMessage.includes("invalid login credentials")) {
    return "invalid_credentials";
  }
  if (normalizedMessage.includes("email not confirmed")) {
    return "email_not_confirmed";
  }
  if (error.status && error.status >= 500) {
    return "network_error";
  }

  return "unknown";
}

function messageForAuthError(code: AuthErrorCode): string {
  switch (code) {
    case "invalid_credentials":
      return "The email or password is incorrect.";
    case "email_not_confirmed":
      return "Confirm this email address before signing in.";
    case "session_restore_failed":
      return "The saved session could not be restored.";
    case "sign_out_failed":
      return "Sign out could not be completed.";
    case "oauth_provider_error":
      return "OAuth sign in could not be started.";
    case "network_error":
      return "The auth request could not be completed.";
    default:
      return "Authentication could not be completed.";
  }
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function asRecord(value: unknown): Readonly<Record<string, unknown>> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return {};
  }

  return value as Readonly<Record<string, unknown>>;
}
