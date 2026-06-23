export {
  getAccessToken,
  getCurrentSession,
  onAuthStateChange,
  signInWithEmailPassword,
  signInWithGoogle,
  signInWithMicrosoft,
  signOut,
} from "./authService";
export { AuthProvider } from "./AuthProvider";
export {
  getSupabaseClient,
  getSupabaseClientResult,
  getSupabaseMobileConfig,
} from "./supabaseClient";
export { useAuth } from "./useAuth";
export type { AuthContextValue, AuthStatus } from "./AuthProvider";
export type {
  AuthErrorCode,
  AuthErrorInfo,
  AuthProvider as AuthLoginProvider,
  AuthResult,
  AuthRole,
  AuthRoleClaims,
  AuthStateChangeCallback,
  AuthStateSubscription,
  AuthUserProfile,
  KnownAuthRole,
  MobileAuthSession,
  OAuthProvider,
  OAuthSignInOptions,
  OAuthSignInStart,
  PublicAuthConfigKey,
  SupabaseOAuthProvider,
  SupabaseSession,
  SupabaseUser,
} from "./authTypes";
