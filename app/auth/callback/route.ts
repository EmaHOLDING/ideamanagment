import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/** returnUrl query param'ı kullanıcı kontrolünde — sadece uygulama içi,
 * göreli bir yola izin verilir. "//evil.com" (protocol-relative) veya
 * mutlak bir URL gibi open-redirect denemeleri reddedilip güvenli bir
 * varsayılana düşülür. */
function sanitizeReturnUrl(raw: string | null): string {
  if (!raw) return "/workspaces";
  if (!raw.startsWith("/") || raw.startsWith("//") || raw.startsWith("/\\")) {
    return "/workspaces";
  }
  return raw;
}

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const returnUrl = sanitizeReturnUrl(searchParams.get("returnUrl"));

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${returnUrl}`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`);
}
