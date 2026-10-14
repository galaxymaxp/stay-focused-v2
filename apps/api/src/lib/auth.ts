import { createClient, type User } from "@supabase/supabase-js";
import type { Database } from "@stay-focused/db";

export async function verifyBearerToken(request: Request): Promise<User | null> {
  const authHeader = request.headers.get("authorization");
  if (!authHeader) return null;

  const parts = authHeader.split(" ");
  if (parts.length !== 2 || parts[0] !== "Bearer" || !parts[1]) return null;
  const token = parts[1];

  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) return null;

  try {
    const supabase = createClient<Database>(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data, error } = await supabase.auth.getUser(token);
    if (error || !data?.user) return null;
    // Activity is server-derived only, and a telemetry failure must not deny
    // otherwise valid authentication. The RPC conditionally writes at most hourly.
    try {
      const activity = await supabase.rpc("record_canvas_api_activity_v1", { p_user_id: data.user.id });
      if (activity.error) console.error("auto_reviewers.activity_unavailable");
    } catch { console.error("auto_reviewers.activity_unavailable"); }
    return data.user;
  } catch {
    return null;
  }
}
