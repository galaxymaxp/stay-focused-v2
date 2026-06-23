export {
  getAccessToken,
  getCurrentSession,
  onAuthStateChange,
  signInWithEmailPassword,
  signInWithGoogle,
  signInWithMicrosoft,
  signOut,
} from "./authService";
export {
  getSupabaseClient,
  getSupabaseClientResult,
  getSupabaseMobileConfig,
} from "./supabaseClient";
export type {
  AuthErrorCode,
  AuthErrorInfo,
  AuthProvider,
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
