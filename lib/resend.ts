import "server-only";
import { Resend } from "resend";

/** RESEND_API_KEY ortam değişkeni set edilmediyse null döner (throw etmez) —
 * böylece e-posta özelliği henüz yapılandırılmamışken uygulama çökmez,
 * sadece sessizce e-posta göndermez (Google OAuth butonuyla aynı desen). */
export function getResendClient(): Resend | null {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return null;
  return new Resend(apiKey);
}
