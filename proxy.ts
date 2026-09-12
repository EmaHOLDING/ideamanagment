import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

/** Supabase'e hem REST (http/https) hem Realtime (ws/wss) üzerinden
 * bağlanılıyor; connect-src her ikisini de açıkça listelemeli, yoksa
 * `default-src 'self'` bunları bloklar ve canlı güncellemeler susar. */
function supabaseOrigins(): string[] {
  const raw = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!raw) return [];
  try {
    const { origin, protocol, host } = new URL(raw);
    const wsProtocol = protocol === "https:" ? "wss:" : "ws:";
    return [origin, `${wsProtocol}//${host}`];
  } catch {
    return [];
  }
}

export function buildCsp(nonce: string, isDev: boolean): string {
  return [
    "default-src 'self'",
    // Asıl XSS savunması burada: script'ler yalnızca nonce'ı taşıyorsa
    // çalışır, 'strict-dynamic' ile Next'in kendi bootstrap script'i
    // yüklediklerine de izin verilir. Dev'de React hata yığınlarını
    // yeniden kurmak için eval kullanıyor (üretimde kullanmıyor).
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${isDev ? " 'unsafe-eval'" : ""}`,
    // style-src'a bilerek nonce KONULMUYOR: nonce varken tarayıcılar
    // 'unsafe-inline'ı yok sayar, bu da proje renkleri gibi satır içi
    // style attribute'larını kırardı. Stil enjeksiyonu, script
    // enjeksiyonuna göre çok daha düşük riskli.
    "style-src 'self' 'unsafe-inline'",
    // blob:/data: — dışa aktarma önizlemesi canvas'tan data URL üretiyor.
    "img-src 'self' blob: data:",
    "font-src 'self'",
    `connect-src 'self' ${[...supabaseOrigins(), ...(isDev ? ["ws:"] : [])].join(" ")}`.trim(),
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    // X-Frame-Options: DENY'ın modern karşılığı (next.config.ts'teki
    // header ile birlikte, eski tarayıcılar için de kapsama sağlar).
    "frame-ancestors 'none'",
    // Yerelde http üzerinden çalışıldığı için dev'de kapalı; açık olsaydı
    // Supabase'e giden http isteklerini https'e yükseltip kırardı.
    ...(isDev ? [] : ["upgrade-insecure-requests"]),
  ].join("; ");
}

export async function proxy(request: NextRequest) {
  const isDev = process.env.NODE_ENV === "development";
  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");
  const csp = buildCsp(nonce, isDev);

  // Next, script etiketlerine nonce'ı basabilmek için CSP'yi İSTEK
  // başlıklarından okur; yanıt başlığına yazmak tek başına yetmez.
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("Content-Security-Policy", csp);

  const response = await updateSession(request, requestHeaders);
  response.headers.set("Content-Security-Policy", csp);
  return response;
}

export const config = {
  matcher: [
    {
      source: "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
      missing: [
        { type: "header", key: "next-router-prefetch" },
        { type: "header", key: "purpose", value: "prefetch" },
      ],
    },
  ],
};
