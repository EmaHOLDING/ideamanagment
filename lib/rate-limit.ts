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
