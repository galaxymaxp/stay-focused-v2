import type { CanvasConnectionRow, Database } from "@stay-focused/db";
import type { SupabaseClient } from "@supabase/supabase-js";

export async function markCanvasReconnectRequired(client: SupabaseClient<Database>, connection: CanvasConnectionRow): Promise<void> {
  const { error } = await client.rpc("mark_canvas_reconnect_required_v1", {
    p_user_id: connection.user_id,
    p_connection_id: connection.id,
    p_expected_updated_at: connection.updated_at,
  });
  if (error) throw new Error("canvas_credential_state_failed");
}
