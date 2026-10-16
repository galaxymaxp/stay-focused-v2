import {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { AppState } from "react-native";

import {
  getCurrentSession as getStoredSession,
  getSavedSession,
  onAuthStateChange,
  signInWithEmailPassword as signInWithPassword,
  signOut as signOutSession,
  signUpWithEmailPassword as signUpWithPassword,
  type SignUpOutcome,
} from "./authService";
import type {
  AuthErrorInfo,
  AuthResult,
  MobileAuthSession,
} from "./authTypes";
import {
  pauseOfflineProcessingIntents,
  resumeOfflineProcessingIntents,
} from "../services/processingOutboxStore";
import { clearProcessingJobReferencesForOwner } from "../services/activeProcessingJobStore";
import { clearCanvasReviewerRecoveryForOwner } from "../services/canvasReviewerRecoveryStore";
import { purgeLocalLibraryForOwner } from "../services/localLibrary/localArtifactDatabase";
import { purgeScreenSnapshotsForOwner } from "../services/screenSnapshots";
import { getApiBaseUrl } from "../config/apiBaseUrl";
import { disableCompletionNotifications } from "../services/completionNotifications";

export type AuthStatus = "restoring" | "signedOut" | "signedIn" | "offline";

export interface AuthContextValue {
  readonly status: AuthStatus;
  readonly session: MobileAuthSession | null;
  readonly error: AuthErrorInfo | null;
  readonly isRestoring: boolean;
  readonly isSigningIn: boolean;
  readonly isSigningUp: boolean;
  readonly isSigningOut: boolean;
  readonly signInWithEmailPassword: (
    email: string,
    password: string,
  ) => Promise<AuthResult<MobileAuthSession>>;
  readonly signUpWithEmailPassword: (
    email: string,
    password: string,
  ) => Promise<AuthResult<SignUpOutcome>>;
  readonly signOut: () => Promise<AuthResult<void>>;
  readonly refreshSession: () => Promise<AuthResult<MobileAuthSession | null>>;
  readonly clearError: () => void;
}

export const AuthContext = createContext<AuthContextValue | null>(null);

interface AuthProviderProps {
  readonly children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [status, setStatus] = useState<AuthStatus>("restoring");
  const [session, setSession] = useState<MobileAuthSession | null>(null);
  const [error, setError] = useState<AuthErrorInfo | null>(null);
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [isSigningUp, setIsSigningUp] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const sessionRef = useRef<MobileAuthSession | null>(null);
  const revision = useRef(0);

  const applySession = useCallback((nextSession: MobileAuthSession | null) => {
    sessionRef.current = nextSession;
    setSession(nextSession);
    setStatus(nextSession ? nextSession.offline ? "offline" : "signedIn" : "signedOut");
    if (nextSession && !nextSession.offline) {
      void resumeOfflineProcessingIntents(nextSession.user.id);
    }
  }, []);

  const applySessionResult = useCallback(
    (result: AuthResult<MobileAuthSession | null>) => {
      if (result.ok) {
        applySession(result.data);
        setError(null);
      } else {
        applySession(null);
        setError(result.error);
      }
    },
    [applySession],
  );

  const refreshSession = useCallback(async () => {
    const started = revision.current;
    const result = await getStoredSession();
    if (started === revision.current) applySessionResult(result);

    return result;
  }, [applySessionResult]);

  useEffect(() => {
    let isMounted = true;
    let refreshing = false;
    const reconcile = async () => {
      if (refreshing || !isMounted) return;
      refreshing = true;
      const started = revision.current;
      try {
        const result = await getStoredSession();
        if (isMounted && started === revision.current) applySessionResult(result);
      } finally { refreshing = false; }
    };

    const subscription = onAuthStateChange((event, nextSession) => {
      if (!isMounted) {
        return;
      }

      // An offline expired-token startup can emit INITIAL_SESSION null. It
      // does not prove logout; SIGNED_OUT and successful reconciliation do.
      if (event === "INITIAL_SESSION" && !nextSession) return;
      revision.current++;
      applySession(nextSession);
      if (nextSession) {
        setError(null);
      }
    });

    if (!subscription.ok) {
      setError(subscription.error);
    }

    void (async () => {
      const started = revision.current;
      const saved = await getSavedSession();
      if (!isMounted || started !== revision.current) return;
      if (saved) applySession(saved);
      void reconcile();
    })();
    const foreground = AppState.addEventListener("change", state => {
      if (state === "active") void reconcile();
    });
    const timer = setInterval(() => {
      if (AppState.currentState === "active" && sessionRef.current?.offline) void reconcile();
    }, 15_000);

    return () => {
      isMounted = false;
      clearInterval(timer);
      foreground.remove();
      if (subscription.ok) {
        subscription.data.unsubscribe();
      }
    };
  }, [applySession, applySessionResult]);

  const signIn = useCallback(
    async (email: string, password: string) => {
      revision.current++;
      setIsSigningIn(true);
      setError(null);

      try {
        const result = await signInWithPassword(email, password);
        if (result.ok) {
          applySession(result.data);
        } else {
          setSession(null);
          setStatus("signedOut");
          setError(result.error);
        }

        return result;
      } finally {
        setIsSigningIn(false);
      }
    },
    [applySession],
  );

  const signUp = useCallback(
    async (email: string, password: string) => {
      revision.current++;
      setIsSigningUp(true);
      setError(null);

      try {
        const result = await signUpWithPassword(email, password);
        if (result.ok && result.data.kind === "signedIn") {
          // Confirmation is disabled on this project, so the account is usable
          // now and the shell can route straight through onboarding.
          applySession(result.data.session);
        } else if (!result.ok) {
          setError(result.error);
        }

        return result;
      } finally {
        setIsSigningUp(false);
      }
    },
    [applySession],
  );

  const signOut = useCallback(async () => {
    revision.current++;
    setIsSigningOut(true);
    setError(null);

    try {
      const ownerUserId = session?.user.id;
      // Unbind this installation while its owner's bearer token is still valid.
      // Offline notification-service failure must not prevent account logout.
      const apiBaseUrl = getApiBaseUrl();
      if (session && apiBaseUrl) {
        await disableCompletionNotifications({ apiBaseUrl, accessToken: session.accessToken }).catch(() => undefined);
      }
      const result = await signOutSession();
      if (result.ok) {
        applySession(null);
        if (ownerUserId) {
          const cleanup = await Promise.allSettled([
            pauseOfflineProcessingIntents(ownerUserId),
            clearProcessingJobReferencesForOwner(ownerUserId),
            clearCanvasReviewerRecoveryForOwner(ownerUserId),
            purgeLocalLibraryForOwner(ownerUserId),
            purgeScreenSnapshotsForOwner(ownerUserId),
          ]);
          if (cleanup.some((entry) => entry.status === "rejected")) {
            setError({ code: "sign_out_failed", message: "Signed out. Some offline data could not be cleared; sign in again to retry cleanup." });
          }
        }
      } else {
        setError(result.error);
      }

      return result;
    } finally {
      setIsSigningOut(false);
    }
  }, [applySession, session]);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      status,
      session,
      error,
      isRestoring: status === "restoring",
      isSigningIn,
      isSigningUp,
      isSigningOut,
      signInWithEmailPassword: signIn,
      signUpWithEmailPassword: signUp,
      signOut,
      refreshSession,
      clearError,
    }),
    [
      status,
      session,
      error,
      isSigningIn,
      isSigningUp,
      isSigningOut,
      signIn,
      signUp,
      signOut,
      refreshSession,
      clearError,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
