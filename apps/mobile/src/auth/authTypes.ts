import type {
  AuthChangeEvent,
  Provider,
  Session,
  Subscription,
  User,
} from "@supabase/supabase-js";

export type AuthResult<T> =
  | {
      readonly ok: true;
      readonly data: T;
    }
  | {
      readonly ok: false;
      readonly error: AuthErrorInfo;
    };

export type AuthErrorCode =
  | "missing_config"
  | "invalid_email"
  | "missing_password"
  | "invalid_credentials"
  | "email_not_confirmed"
  | "session_restore_failed"
  | "token_unavailable"
  | "sign_out_failed"
  | "oauth_redirect_missing"
  | "oauth_provider_error"
  | "network_error"
  | "unknown";

export interface AuthErrorInfo {
  readonly code: AuthErrorCode;
  readonly message: string;
  readonly status?: number;
  readonly provider?: OAuthProvider;
  readonly missingConfig?: readonly PublicAuthConfigKey[];
}

export type PublicAuthConfigKey =
  | "EXPO_PUBLIC_SUPABASE_URL"
  | "EXPO_PUBLIC_SUPABASE_ANON_KEY";

export type AuthProvider = "email" | OAuthProvider;

export type OAuthProvider = "google" | "microsoft";

export type SupabaseOAuthProvider = Extract<Provider, "azure" | "google">;

export type KnownAuthRole =
  | "student"
  | "teacher"
  | "school_admin"
  | "org_admin"
  | "admin";

export type AuthRole = KnownAuthRole | (string & {});

export interface AuthRoleClaims {
  readonly roles: readonly AuthRole[];
  readonly organizationId: string | null;
  readonly schoolId: string | null;
  readonly subscriptionTier: string | null;
  readonly source: "app_metadata" | "none";
}

export interface AuthUserProfile {
  readonly id: string;
  readonly email: string | null;
  readonly phone: string | null;
  readonly appMetadata: Readonly<Record<string, unknown>>;
  readonly userMetadata: Readonly<Record<string, unknown>>;
}

export interface MobileAuthSession {
  readonly accessToken: string;
  readonly expiresAt: number | null;
  readonly provider: AuthProvider;
  readonly user: AuthUserProfile;
  readonly roles: AuthRoleClaims;
}

export interface OAuthSignInOptions {
  readonly redirectTo: string;
  readonly scopes?: string;
  readonly queryParams?: Readonly<Record<string, string>>;
}

export interface OAuthSignInStart {
  readonly provider: OAuthProvider;
  readonly supabaseProvider: SupabaseOAuthProvider;
  readonly url: string;
}

export type AuthStateChangeCallback = (
  event: AuthChangeEvent,
  session: MobileAuthSession | null,
) => void;

export interface AuthStateSubscription {
  readonly unsubscribe: Subscription["unsubscribe"];
}

export type SupabaseSession = Session;

export type SupabaseUser = User;
