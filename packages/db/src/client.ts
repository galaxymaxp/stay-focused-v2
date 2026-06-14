import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "./types";

export interface AuthenticatedClientOptions {
  supabaseUrl: string;
  supabaseAnonKey: string;
  accessToken: string;
}

export function createAuthenticatedClient({
  supabaseUrl,
  supabaseAnonKey,
  accessToken,
}: AuthenticatedClientOptions): SupabaseClient<Database> {
  return createClient<Database>(supabaseUrl, supabaseAnonKey, {
    auth: {
      autoRefreshToken: false,
      detectSessionInUrl: false,
      persistSession: false,
    },
    global: {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
  });
}
