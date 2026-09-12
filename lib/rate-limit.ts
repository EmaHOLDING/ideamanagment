import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";

export class RateLimitError extends Error {
  constructor(message = "Çok fazla istek gönderdiniz. Lütfen biraz bekleyip tekrar deneyin.") {
    super(message);
    this.name = "RateLimitError";
  }
}

/** Sabit pencereli rate limit kontrolü — `key` bazında `windowSeconds`
 * içinde en fazla `maxCount` istek geçer, aşılırsa RateLimitError fırlatır.
 * `key` genelde `<actionName>:<userId>` şeklinde kurulur. */
export async function enforceRateLimit(
  supabase: SupabaseClient,
  key: string,
  maxCount: number,
  windowSeconds: number
) {
  const { data, error } = await supabase.rpc("check_rate_limit", {
    _key: key,
    _max_count: maxCount,
    _window_seconds: windowSeconds,
  });

  if (error) throw error;
  if (!data) throw new RateLimitError();
}

/** Tüm yazma action'ları için ortak, geniş kova: kullanıcı başına 5
 * dakikada 300 yazma (~saniyede 1). Bir insan sürükle-bırak yaparken veya
 * hızlı düzenlerken buraya asla çarpmaz; otomatik bir döngü çarpar. Amaç
 * tek tek action'ları kısmak değil, kaçak bir script'in workspace'i
 * doldurmasını durdurmak. */
export async function enforceWriteLimit(supabase: SupabaseClient, userId: string) {
  await enforceRateLimit(supabase, `write:${userId}`, 300, 300);
}

/** Kalıcı içerik üreten (fikir/proje/etiket/kolon/şablon) action'lar için
 * ek ve daha dar sınır: action başına saatte 60. Ortak kovanın üstüne
 * biniyor — kova ani patlamayı, bu ise uzun soluklu birikmeyi kesiyor. */
export async function enforceCreateLimit(
  supabase: SupabaseClient,
  userId: string,
  action: string
) {
  await enforceRateLimit(supabase, `create:${action}:${userId}`, 60, 3600);
}
