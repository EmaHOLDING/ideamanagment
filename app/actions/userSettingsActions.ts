"use server";

import { z } from "zod";
import { requireUser, withAuthRetry } from "./_shared";
import { enforceWriteLimit } from "@/lib/rate-limit";
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

/** Kullanıcının tamamladığı en yüksek uygulama turu sürümü (hiç
 * tamamlamadıysa 0). Layout bunu PRODUCT_TOUR_VERSION ile karşılaştırıp
 * turun kendiliğinden açılıp açılmayacağına karar veriyor. */
export async function getProductTourStatus(): Promise<{ completedVersion: number }> {
  const { supabase, user } = await requireUser();

  const row = await withAuthRetry(async () => {
    const { data, error } = await supabase
      .from("user_onboarding")
      .select("completed_tour_version")
      .eq("user_id", user.id)
      .maybeSingle();
    if (error) throw error;
    return data;
  });

  return { completedVersion: row?.completed_tour_version ?? 0 };
}

const tourVersionSchema = z.number().int().min(1).max(1000);

/** Tur kapatıldığında (bitirerek ya da atlayarak) çağrılır. Tabloya
 * istemciden doğrudan yazma izni yok; tek yol bu RPC (bkz.
 * 20261017100000_user_onboarding.sql). */
export async function completeProductTour(version: number) {
  const parsedVersion = tourVersionSchema.parse(version);
  const { supabase, user } = await requireUser();
  await enforceWriteLimit(supabase, user.id);

  const { error } = await supabase.rpc("complete_product_tour", { _version: parsedVersion });
  if (error) throw error;

  return { success: true as const };
}
