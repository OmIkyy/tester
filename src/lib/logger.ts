import { supabase } from "@/integrations/supabase/client";

export async function logActivity(action: string, details?: string) {
  try {
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) return;
    const { error } = await supabase.from("activity_logs").insert({
      user_id: user.id,
      action,
      details: details ?? null,
    });
    if (error) console.warn("Failed to insert activity log:", error);
  } catch (e) {
    console.warn("Failed to log activity", e);
  }
}