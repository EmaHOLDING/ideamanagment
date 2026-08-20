import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { notifyByEmailIfOffline } from "./_email";
import { NOTIFICATION_EVENTS, type NotificationEventType } from "@/lib/notification-registry";

/** Bir kullanıcının belirli bir olay tipi için e-posta tercihi — satır
 * yoksa registry'deki varsayılana düşer. Admin client kullanılıyor çünkü
 * bu fonksiyon başka bir kullanıcının (bildirim alıcısının) tercihini
 * okuyor, RLS çağıranın kendi satırlarıyla sınırlı. */
async function getEmailPreference(userId: string, type: NotificationEventType): Promise<boolean> {
  const config = NOTIFICATION_EVENTS[type];
  if (!config.emailEligible) return false;

  const admin = createAdminClient();
  const { data } = await admin
    .from("notification_preferences")
    .select("email_enabled")
    .eq("user_id", userId)
    .eq("event_type", type)
    .maybeSingle();

  return data ? data.email_enabled : config.defaultEmailEnabled;
}

/** Bildirim sisteminin merkezi giriş noktası: uygulama içi bildirim
 * satırlarını ekler, ardından (olay e-posta gönderebiliyorsa ve alıcının
 * tercihi açıksa) her alıcı için notifyByEmailIfOffline'ı tetikler. Tüm
 * çağıranlar (yorum/atama/kart taşıma/workspace katılımı) tek bu
 * fonksiyondan geçerek olay tipi + tercih + e-posta mantığını tekrar
 * yazmak zorunda kalmaz. */
export async function notifyEvent(params: {
  type: NotificationEventType;
  recipientUserIds: string[];
  actorId: string;
  workspaceId: string;
  ideaId?: string | null;
  message: string;
  email?: { subject: string; html: string };
}) {
  const recipients = [...new Set(params.recipientUserIds)].filter((id) => id !== params.actorId);
  if (recipients.length === 0) return;

  const admin = createAdminClient();
  const { error } = await admin.from("notifications").insert(
    recipients.map((userId) => ({
      user_id: userId,
      actor_id: params.actorId,
      idea_id: params.ideaId ?? null,
      workspace_id: params.workspaceId,
      type: params.type,
      message: params.message,
    }))
  );
  if (error) throw error;

  if (!params.email) return;
  const { subject, html } = params.email;

  await Promise.all(
    recipients.map(async (userId) => {
      const enabled = await getEmailPreference(userId, params.type);
      if (!enabled) return;
      await notifyByEmailIfOffline({ recipientUserId: userId, subject, html });
    })
  );
}
