import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@stay-focused/db";

export function createCanvasServiceClient(): SupabaseClient<Database> {
  const supabaseUrl = process.env.SUPABASE_URL?.trim();
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("Canvas storage service Supabase config is missing.");
  }

  return createClient<Database>(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      detectSessionInUrl: false,
      persistSession: false,
    },
  });
}
