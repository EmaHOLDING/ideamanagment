"use server";

import { z } from "zod";
import { requireUser } from "./_shared";

export async function getEmailNotificationsPreference() {
  const { user } = await requireUser();
  const enabled = user.user_metadata?.email_notifications_enabled;
  return enabled !== false;
}

const setEmailNotificationsSchema = z.boolean();

export async function setEmailNotificationsEnabled(enabled: boolean) {
  const parsed = setEmailNotificationsSchema.parse(enabled);
  const { supabase } = await requireUser();

  const { error } = await supabase.auth.updateUser({
    data: { email_notifications_enabled: parsed },
  });

  if (error) throw error;

  return { success: true as const };
}
