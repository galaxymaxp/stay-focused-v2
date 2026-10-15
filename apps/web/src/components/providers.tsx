"use client";
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
  useState,
  type ReactNode,
} from "react";
import { purgeScreenSnapshots } from "../lib/screen-snapshots";
import { createApi, type Api } from "../lib/api";

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
      detectSessionInUrl: true,
      flowType: "pkce",
      storageKey: "stay-focused-web-auth",
    },
  });
  return singleton;
}
export function Providers({ children }: { children: ReactNode }) {
  const [client, setClient] = useState<SupabaseClient | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true),
    [error, setError] = useState<string | null>(null);
  const [theme, updateTheme] = useState<Preference>("system");
  useEffect(() => {
    try {
      const stored = localStorage.getItem("stay-focused-web-theme");
      if (stored === "light" || stored === "dark") updateTheme(stored);
    } catch {
      /* OS preference still works if storage is unavailable. */
    }
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
    const acceptSession = (next: Session | null) => {
      if (observedOwner && observedOwner !== next?.user.id) void purgeScreenSnapshots(observedOwner);
      observedOwner = next?.user.id ?? null;
      setSession(next);
    };
    let alive = true,
      revision = 0;
    const {
      data: { subscription },
    } = auth.auth.onAuthStateChange((_event, next) => {
      revision++;
      if (alive) {
        acceptSession(next);
        setLoading(false);
        setError(null);
      }
    });
    const initialRevision = revision;
    void auth.auth
      .getSession()
      .then(({ data, error: failure }) => {
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
      value={{ client, session, loading, error, api, theme, setTheme, signOut }}
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
