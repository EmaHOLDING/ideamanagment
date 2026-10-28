import type { Provider } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";

/** OAuth girişini başlatır: sağlayıcıya yönlendirir, dönüşte
 * /auth/callback oturumu açıp kullanıcıyı `returnUrl`'e gönderir.
 * (`returnUrl` callback tarafında ayrıca açık yönlendirmeye karşı
 * doğrulanıyor; bkz. app/auth/callback/route.ts.) */
export function startOAuthSignIn(provider: Provider, returnUrl = "/workspaces") {
  const supabase = createClient();
  const callbackUrl = new URL("/auth/callback", window.location.origin);
  callbackUrl.searchParams.set("returnUrl", returnUrl);
  return supabase.auth.signInWithOAuth({
    provider,
    options: { redirectTo: callbackUrl.toString() },
  });
}
