"use client";
import { usePathname, useRouter } from 'next/navigation';
import {
  createClient,
  type Session,
  type SupabaseClient,
} from "@supabase/supabase-js";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { purgeScreenSnapshots } from "../lib/screen-snapshots";
import { createApi, type Api } from "../lib/api";
import { RECOVERY_OWNER_KEY, recoveryParams } from "../features/password-reset";

type Preference = "system" | "light" | "dark";
interface AuthState {
  client: SupabaseClient | null;
  session: Session | null;
  loading: boolean;
  error: string | null;
  api: Api;
  theme: Preference;
  setTheme: (value: Preference) => void;
  signOut: () => Promise<void>;
  recoveryRequired: boolean;
  completePasswordRecovery: () => void;
}
const Context = createContext<AuthState | null>(null);
let singleton: SupabaseClient | null = null;
function browserClient() {
  if (typeof window === "undefined") return null;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL,
    key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  singleton ??= createClient(url, key, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      // auth-js rejects implicit hashes in PKCE mode. Those recovery links
      // are established explicitly below; PKCE keeps automatic code exchange.
      detectSessionInUrl: recoveryParams(location.search, location.hash).kind !== "hash",
      flowType: "pkce",
      storageKey: "stay-focused-web-auth",
    },
  });
  return singleton;
}
export function Providers({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  return pathname === '/privacy' || pathname === '/terms' || pathname === '/download' || pathname === '/release' || pathname?.startsWith('/s/') ? <PublicTheme>{children}</PublicTheme> : <AuthenticatedProviders>{children}</AuthenticatedProviders>;
}
/** Public pages never initialize auth, refresh tokens or hydrate private caches. */
function PublicTheme({ children }: { children: ReactNode }) {
  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const apply = () => {
      let saved: string | null = null;
      try { saved = localStorage.getItem('stay-focused-web-theme'); } catch { /* OS fallback */ }
      document.documentElement.dataset.theme = saved === 'light' || saved === 'dark' ? saved : media.matches ? 'dark' : 'light';
    };
    apply(); media.addEventListener('change', apply);
    return () => media.removeEventListener('change', apply);
  }, []);
  return children;
}
function AuthenticatedProviders({ children }: { children: ReactNode }) {
  const router = useRouter(), pathname = usePathname();
  const [client, setClient] = useState<SupabaseClient | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true),
    [error, setError] = useState<string | null>(null);
  const [theme, updateTheme] = useState<Preference>("system");
  const [recoveryOwner, setRecoveryOwner] = useState<string | null>(null);
  const recoveryOwnerRef = useRef<string | null>(null);
  const hashCompletion = useRef<Promise<Session | null> | null>(null);
  const recoveryRequired = Boolean(session && recoveryOwner === session.user.id);
  const completePasswordRecovery = useCallback(() => {
    recoveryOwnerRef.current = null;
    setRecoveryOwner(null);
    try { sessionStorage.removeItem(RECOVERY_OWNER_KEY); } catch { /* In-memory guard remains available. */ }
  }, []);
  useEffect(() => {
    if (recoveryRequired && pathname !== "/auth/reset") router.replace("/auth/reset");
  }, [recoveryRequired, pathname, router]);
  useEffect(() => {
    try {
      const stored = localStorage.getItem("stay-focused-web-theme");
      if (stored === "light" || stored === "dark") updateTheme(stored);
    } catch {
      /* OS preference still works if storage is unavailable. */
    }
    // Capture before SDK initialization consumes the code or clears the hash.
    const link = recoveryParams(location.search, location.hash);
    recoveryOwnerRef.current = null;
    try {
      // A second, invalid link must not clear an already accepted recovery
      // session and let it bypass the password step. Bind evidence to its owner.
      recoveryOwnerRef.current = sessionStorage.getItem(RECOVERY_OWNER_KEY);
    } catch { /* Storage may be unavailable; current-visit recovery still works. */ }
    let auth: SupabaseClient | null;
    try {
      auth = browserClient();
    } catch {
      setError("Sign-in is not configured for this environment.");
      setLoading(false);
      return;
    }
    setClient(auth);
    if (!auth) {
      setError("Sign-in is not configured for this environment.");
      setLoading(false);
      return;
    }
    let observedOwner: string | null = null;
    const acceptSession = (next: Session | null, recovery = false) => {
      if (observedOwner && observedOwner !== next?.user.id) void purgeScreenSnapshots(observedOwner);
      observedOwner = next?.user.id ?? null;
      if (recovery && next) recoveryOwnerRef.current = next.user.id;
      if (!next || recoveryOwnerRef.current !== next.user.id) recoveryOwnerRef.current = null;
      setRecoveryOwner(recoveryOwnerRef.current);
      try {
        if (recoveryOwnerRef.current) sessionStorage.setItem(RECOVERY_OWNER_KEY, recoveryOwnerRef.current);
        else sessionStorage.removeItem(RECOVERY_OWNER_KEY);
      } catch { /* Keep the in-memory guard when storage is unavailable. */ }
      setSession(next);
    };
    let alive = true,
      revision = 0;
    const {
      data: { subscription },
    } = auth.auth.onAuthStateChange((event, next) => {
      revision++;
      if (alive) {
        acceptSession(next, event === "PASSWORD_RECOVERY");
        // Explicit hash establishment must finish before publishing readiness.
        if (link.kind !== "hash") setLoading(false);
        setError(null);
      }
    });
    const initialRevision = revision;
    const activeClient = auth;
    if (link.kind === "hash") {
      hashCompletion.current ??= activeClient.auth.setSession({ access_token: link.access_token, refresh_token: link.refresh_token })
        .then(({ data, error: failure }) => failure ? null : data.session)
        .catch(() => null);
    }
    void (async () => {
      if (link.kind === "hash") {
        const recovered = await hashCompletion.current;
        if (!alive) return;
        // Remove credentials from browser history even on failure.
        window.history.replaceState(window.history.state, "", location.pathname + location.search);
        acceptSession(recovered, Boolean(recovered));
        setLoading(false);
        return;
      }
      return activeClient.auth.getSession();
    })()
      .then((result) => {
        if (!result) return;
        const { data, error: failure } = result;
        if (alive && revision === initialRevision) {
          acceptSession(data.session);
          setError(
            failure
              ? "Your session could not be restored. Please sign in again."
              : null,
          );
          setLoading(false);
        }
      })
      .catch(() => {
        if (alive) {
          setError("Your session could not be restored. Please sign in again.");
          setLoading(false);
        }
      });
    return () => {
      alive = false;
      subscription.unsubscribe();
    };
  }, []);
  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const apply = () => {
      document.documentElement.dataset.theme =
        theme === "system" ? (media.matches ? "dark" : "light") : theme;
    };
    apply();
    media.addEventListener("change", apply);
    return () => media.removeEventListener("change", apply);
  }, [theme]);
  const setTheme = useCallback((value: Preference) => {
    updateTheme(value);
    try {
      localStorage.setItem("stay-focused-web-theme", value);
    } catch {
      /* Keep the selected theme for this visit. */
    }
  }, []);
  const signOut = useCallback(async () => {
    const owner = session?.user.id;
    const result = await client?.auth.signOut({ scope: "local" });
    if (result?.error) throw new Error("Could not sign out. Please try again.");
    if (owner) await purgeScreenSnapshots(owner);
  }, [client, session?.user.id]);
  const api = useMemo(
    () =>
      createApi(
        async (refresh) => {
          if (!client) return null;
          const { data, error: failure } = refresh
            ? await client.auth.refreshSession()
            : await client.auth.getSession();
          return failure || data.session?.user.id !== session?.user.id
            ? null
            : (data.session?.access_token ?? null);
        },
        () => {
          if (session?.user.id) void purgeScreenSnapshots(session.user.id);
          setSession((current) =>
            current?.user.id === session?.user.id ? null : current,
          );
          setError("Your session expired. Please sign in again.");
        },
      ),
    [client, session?.user.id],
  );
  return (
    <Context.Provider
      value={{ client, session, loading, error, api, theme, setTheme, signOut, recoveryRequired, completePasswordRecovery }}
    >
      {children}
    </Context.Provider>
  );
}
export function useAuth() {
  const value = useContext(Context);
  if (!value) throw new Error("Missing auth provider");
  return value;
}
