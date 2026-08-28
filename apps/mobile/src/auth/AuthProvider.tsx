import {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import {
  getCurrentSession as getStoredSession,
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

export type AuthStatus = "restoring" | "signedOut" | "signedIn";

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

  const applySession = useCallback((nextSession: MobileAuthSession | null) => {
    setSession(nextSession);
    setStatus(nextSession ? "signedIn" : "signedOut");
    if (nextSession) {
      void resumeOfflineProcessingIntents(nextSession.user.id);
    }
  }, []);

  const applySessionResult = useCallback(
    (result: AuthResult<MobileAuthSession | null>) => {
      if (result.ok) {
        applySession(result.data);
        setError(null);
      } else {
        setSession(null);
        setStatus("signedOut");
        setError(result.error);
      }
    },
    [applySession],
  );

  const refreshSession = useCallback(async () => {
    setStatus("restoring");
    const result = await getStoredSession();
    applySessionResult(result);

    return result;
  }, [applySessionResult]);

  useEffect(() => {
    let isMounted = true;

    const subscription = onAuthStateChange((_event, nextSession) => {
      if (!isMounted) {
        return;
      }

      applySession(nextSession);
      if (nextSession) {
        setError(null);
      }
    });

    if (!subscription.ok) {
      setError(subscription.error);
    }

    void (async () => {
      setStatus("restoring");
      const result = await getStoredSession();
      if (isMounted) {
        applySessionResult(result);
      }
    })();

    return () => {
      isMounted = false;
      if (subscription.ok) {
        subscription.data.unsubscribe();
      }
    };
  }, [applySession, applySessionResult]);

  const signIn = useCallback(
    async (email: string, password: string) => {
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
    setIsSigningOut(true);
    setError(null);

    try {
      const ownerUserId = session?.user.id;
      const result = await signOutSession();
      if (result.ok) {
        if (ownerUserId) {
          await pauseOfflineProcessingIntents(ownerUserId);
        }
        applySession(null);
      } else {
        setError(result.error);
      }

      return result;
    } finally {
      setIsSigningOut(false);
    }
  }, [applySession, session?.user.id]);

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
