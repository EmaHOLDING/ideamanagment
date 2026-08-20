"use server";

import { z } from "zod";
import { requireUser, withAuthRetry } from "./_shared";
import {
  NOTIFICATION_EVENTS,
  EMAIL_ELIGIBLE_EVENT_TYPES,
  type NotificationEventType,
} from "@/lib/notification-registry";

/** Çağıran kullanıcının e-posta gönderebilen her olay tipi için etkin
 * tercihini döner — tercih kaydı yoksa registry'deki varsayılan kullanılır. */
export async function getMyNotificationPreferences(): Promise<
  Record<NotificationEventType, boolean>
> {
  const { supabase, user } = await requireUser();

  const rows = await withAuthRetry(async () => {
    const { data, error } = await supabase
      .from("notification_preferences")
      .select("event_type, email_enabled")
      .eq("user_id", user.id);
    if (error) throw error;
    return data;
  });

  const overrides = new Map(rows.map((r) => [r.event_type, r.email_enabled]));

  return Object.fromEntries(
    EMAIL_ELIGIBLE_EVENT_TYPES.map((type) => [
      type,
      overrides.get(type) ?? NOTIFICATION_EVENTS[type].defaultEmailEnabled,
    ])
  ) as Record<NotificationEventType, boolean>;
}

const setPreferenceSchema = z.object({
  eventType: z.enum(EMAIL_ELIGIBLE_EVENT_TYPES as [NotificationEventType, ...NotificationEventType[]]),
  enabled: z.boolean(),
});

export async function setNotificationPreference(eventType: NotificationEventType, enabled: boolean) {
  const input = setPreferenceSchema.parse({ eventType, enabled });
  const { supabase, user } = await requireUser();

  const { error } = await supabase
    .from("notification_preferences")
    .upsert(
      {
        user_id: user.id,
        event_type: input.eventType,
        email_enabled: input.enabled,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id,event_type" }
    );

  if (error) throw error;

  return { success: true as const };
}
