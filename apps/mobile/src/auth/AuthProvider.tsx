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
} from "./authService";
import type {
  AuthErrorInfo,
  AuthResult,
  MobileAuthSession,
} from "./authTypes";

export type AuthStatus = "restoring" | "signedOut" | "signedIn";

export interface AuthContextValue {
  readonly status: AuthStatus;
  readonly session: MobileAuthSession | null;
  readonly error: AuthErrorInfo | null;
  readonly isRestoring: boolean;
  readonly isSigningIn: boolean;
  readonly isSigningOut: boolean;
  readonly signInWithEmailPassword: (
    email: string,
    password: string,
  ) => Promise<AuthResult<MobileAuthSession>>;
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
  const [isSigningOut, setIsSigningOut] = useState(false);

  const applySession = useCallback((nextSession: MobileAuthSession | null) => {
    setSession(nextSession);
    setStatus(nextSession ? "signedIn" : "signedOut");
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

  const signOut = useCallback(async () => {
    setIsSigningOut(true);
    setError(null);

    try {
      const result = await signOutSession();
      if (result.ok) {
        applySession(null);
      } else {
        setError(result.error);
      }

      return result;
    } finally {
      setIsSigningOut(false);
    }
  }, [applySession]);

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
      isSigningOut,
      signInWithEmailPassword: signIn,
      signOut,
      refreshSession,
      clearError,
    }),
    [
      status,
      session,
      error,
      isSigningIn,
      isSigningOut,
      signIn,
      signOut,
      refreshSession,
      clearError,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
