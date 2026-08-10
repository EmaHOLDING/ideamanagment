import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { getResendClient } from "@/lib/resend";

/** Heartbeat aralığının (45sn) yaklaşık 2.5 katı — geçici ağ gecikmesi veya
 * sekmenin kısa süreliğine arka planda kalması "çevrimdışı" yanlış-pozitifi
 * üretmesin diye güvenli bir pay bırakıyor. */
const ONLINE_THRESHOLD_MS = 2 * 60 * 1000;

/**
 * Sadece mention (@etiketleme) ve sorumlu atama olaylarında çağrılır.
 * Karar sırası: tercih kapalıysa iptal -> alıcı çevrimiçiyse iptal ->
 * aksi halde Resend ile e-posta gönderilir. Hiçbir hata çağıran server
 * action'ı patlatmaz (mention/atama işlemi e-posta yüzünden asla başarısız
 * olmamalı).
 */
export async function notifyByEmailIfOffline(params: {
  recipientUserId: string;
  subject: string;
  html: string;
}) {
  try {
    const admin = createAdminClient();

    const { data } = await admin.auth.admin.getUserById(params.recipientUserId);
    const recipient = data?.user;
    if (!recipient?.email) return;

    const prefsEnabled = recipient.user_metadata?.email_notifications_enabled;
    if (prefsEnabled === false) return;

    const { data: presence } = await admin
      .from("user_presence")
      .select("last_seen_at")
      .eq("user_id", params.recipientUserId)
      .maybeSingle();

    const isOnline =
      !!presence?.last_seen_at &&
      Date.now() - new Date(presence.last_seen_at).getTime() < ONLINE_THRESHOLD_MS;
    if (isOnline) return;

    const resend = getResendClient();
    if (!resend) return;

    await resend.emails.send({
      from: process.env.EMAIL_FROM!,
      to: recipient.email,
      subject: params.subject,
      html: params.html,
    });
  } catch (err) {
    console.error("[email] gönderilemedi:", err);
  }
}
