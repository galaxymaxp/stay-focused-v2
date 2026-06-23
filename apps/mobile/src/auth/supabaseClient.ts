import "react-native-url-polyfill/auto";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { AppState, type AppStateStatus } from "react-native";

import type {
  AuthErrorInfo,
  AuthResult,
  PublicAuthConfigKey,
} from "./authTypes";
import { sessionStore } from "./sessionStore";

const SUPABASE_AUTH_STORAGE_KEY = "stay-focused-v2.supabase.auth";

interface SupabaseMobileConfig {
  readonly supabaseUrl: string;
  readonly supabaseAnonKey: string;
}

let mobileSupabaseClient: SupabaseClient | null = null;
let authRefreshSubscription: { readonly remove: () => void } | null = null;

export function getSupabaseClient(): SupabaseClient | null {
  const config = getSupabaseMobileConfig();
  if (!config.ok) {
    return null;
  }

  if (!mobileSupabaseClient) {
    mobileSupabaseClient = createClient(
      config.data.supabaseUrl,
      config.data.supabaseAnonKey,
      {
        auth: {
          autoRefreshToken: true,
          detectSessionInUrl: false,
          flowType: "pkce",
          persistSession: true,
          storage: sessionStore,
          storageKey: SUPABASE_AUTH_STORAGE_KEY,
        },
      },
    );
    registerAuthRefreshLifecycle(mobileSupabaseClient);
  }

  return mobileSupabaseClient;
}

export function getSupabaseClientResult(): AuthResult<SupabaseClient> {
  const config = getSupabaseMobileConfig();
  if (!config.ok) {
    return config;
  }

  const client = getSupabaseClient();
  if (!client) {
    return {
      ok: false,
      error: configError([]),
    };
  }

  return { ok: true, data: client };
}

export function getSupabaseMobileConfig(): AuthResult<SupabaseMobileConfig> {
  const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL?.trim();
  const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY?.trim();
  const missingConfig: PublicAuthConfigKey[] = [];

  if (!supabaseUrl) {
    missingConfig.push("EXPO_PUBLIC_SUPABASE_URL");
  }
  if (!supabaseAnonKey) {
    missingConfig.push("EXPO_PUBLIC_SUPABASE_ANON_KEY");
  }

  if (missingConfig.length > 0) {
    return {
      ok: false,
      error: configError(missingConfig),
    };
  }

  if (!supabaseUrl || !supabaseAnonKey) {
    return {
      ok: false,
      error: configError(missingConfig),
    };
  }

  return {
    ok: true,
    data: {
      supabaseUrl,
      supabaseAnonKey,
    },
  };
}

function configError(missingConfig: readonly PublicAuthConfigKey[]): AuthErrorInfo {
  return {
    code: "missing_config",
    message:
      "Supabase mobile auth is not configured. Set the public Supabase URL and anon key.",
    missingConfig,
  };
}

function registerAuthRefreshLifecycle(client: SupabaseClient): void {
  if (authRefreshSubscription) {
    return;
  }

  const syncAutoRefresh = (state: AppStateStatus): void => {
    const action =
      state === "active"
        ? client.auth.startAutoRefresh()
        : client.auth.stopAutoRefresh();

    void action.catch(() => undefined);
  };

  syncAutoRefresh(AppState.currentState);
  authRefreshSubscription = AppState.addEventListener("change", syncAutoRefresh);
}
