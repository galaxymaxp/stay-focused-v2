import { createAuthenticatedClient } from "@stay-focused/db";

export function createReviewerUserClient(accessToken: string) {
  const supabaseUrl =
    process.env.SUPABASE_URL?.trim() ??
    process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ??
    process.env.EXPO_PUBLIC_SUPABASE_URL?.trim() ??
    "";
  const supabaseAnonKey =
    process.env.SUPABASE_ANON_KEY?.trim() ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() ??
    process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY?.trim() ??
    "";

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error("Reviewer storage user-scoped Supabase config is missing.");
  }

  return createAuthenticatedClient({
    supabaseUrl,
    supabaseAnonKey,
    accessToken,
  });
}
