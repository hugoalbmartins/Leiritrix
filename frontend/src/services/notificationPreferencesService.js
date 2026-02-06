import { supabase } from "@/lib/supabase";

export const notificationPreferencesService = {
  async getPreferences(userId) {
    const { data, error } = await supabase
      .from("notification_preferences")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();

    if (error) throw error;
    return data;
  },

  async upsertPreferences(userId, prefs) {
    const { data, error } = await supabase
      .from("notification_preferences")
      .upsert(
        {
          user_id: userId,
          sales_alerts: prefs.sales_alerts,
          loyalty_alerts: prefs.loyalty_alerts,
          lead_alerts: prefs.lead_alerts,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id" }
      )
      .select()
      .single();

    if (error) throw error;
    return data;
  },
};
